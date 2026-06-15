const fs      = require("fs");
const path    = require("path");
const axios   = require("axios");
const multer  = require("multer");
const ATSAnalysis = require("../models/atsAnalysis");
const { computeFitScore, extractSkillEntities } = require("../utils/nlpPipeline");

let pdfjsLib;
(async () => {
    try {
        pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    } catch (err) {
        console.error("Failed to load pdfjs-dist:", err);
        pdfjsLib = null;
    }
})();

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "../../public");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `ats-${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── OpenRouter AI helper ──────────────────────────────────────────────────────
const askAi = async (messages, json = false) => {
    const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            model:    "openai/gpt-4o-mini",
            messages,
            ...(json && { response_format: { type: "json_object" } }),
        },
        {
            headers: {
                Authorization:  `Bearer ${process.env.OPENROUTER_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title":      "ATS Analyzer",
            },
        }
    );
    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");
    return content;
};

// ── PDF text extraction ───────────────────────────────────────────────────────
const extractPdfText = async (filepath) => {
    if (!pdfjsLib) throw new Error("PDF library not available");
    const buffer   = await fs.promises.readFile(filepath);
    const uint8    = new Uint8Array(buffer);
    const pdf      = await pdfjsLib.getDocument({ data: uint8 }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page    = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
    }
    return text.replace(/\s+/g, " ").trim();
};

// ── AI: Extract JD keywords (enhanced) ───────────────────────────────────────
const extractKeywordsAI = async (jdText) => {
    const raw = await askAi([
        {
            role:    "system",
            content: `Extract all important keywords from this job description.
Return ONLY a JSON object like:
{
  "technical": ["React", "Node.js", "AWS"],
  "soft": ["communication", "leadership"],
  "tools": ["Jira", "Git"],
  "qualifications": ["Bachelor's degree", "3+ years experience"],
  "role": "Frontend Developer"
}`,
        },
        { role: "user", content: jdText },
    ]);
    try {
        const clean = raw.replace(/```json|```/g, "").trim();
        return JSON.parse(clean);
    } catch {
        return { technical: [], soft: [], tools: [], qualifications: [], role: "Software Engineer" };
    }
};

// ── AI: Section detection ─────────────────────────────────────────────────────
const detectSections = async (resumeText) => {
    const raw = await askAi([
        {
            role:    "system",
            content: `Analyze this resume and detect sections. Score each section 0-100 for ATS friendliness.
Return ONLY JSON:
{
  "sections": {
    "contact":    { "present": true,  "score": 90, "issue": "" },
    "summary":    { "present": true,  "score": 75, "issue": "Too vague" },
    "skills":     { "present": true,  "score": 85, "issue": "" },
    "experience": { "present": true,  "score": 70, "issue": "Weak action verbs" },
    "education":  { "present": true,  "score": 95, "issue": "" },
    "projects":   { "present": false, "score": 0,  "issue": "Missing projects section" }
  },
  "format": {
    "score": 80,
    "issues": ["Uses tables which ATS can't parse", "Missing quantified achievements"]
  },
  "bullets": ["Developed React components", "Managed team of 5"]
}`,
        },
        { role: "user", content: resumeText.slice(0, 3000) },
    ]);
    try {
        const clean = raw.replace(/```json|```/g, "").trim();
        return JSON.parse(clean);
    } catch {
        return { sections: {}, format: { score: 70, issues: [] }, bullets: [] };
    }
};

// ── AI: Score justification + skill gaps + learning path ──────────────────────
const generateLLMAnalysis = async (resumeText, jdText, fitScore, missingSkills, role) => {
    const raw = await askAi([
        {
            role: "system",
            content: `You are an expert career consultant and ATS specialist. Analyze this resume against the job description.

The candidate scored ${fitScore}/100 on ATS fit. Their missing skills are: ${missingSkills.slice(0, 15).join(", ")}.

Return ONLY JSON:
{
  "justification": "2-4 sentence explanation of WHY the candidate scored ${fitScore}/100. Be specific about strengths and weaknesses.",
  "skillGaps": [
    {
      "skill": "Docker",
      "severity": "critical",
      "reason": "Required in JD, not mentioned in resume",
      "action": "Add Docker experience or containerization projects"
    }
  ],
  "learningPath": [
    {
      "skill": "Docker",
      "priority": 1,
      "timeEstimate": "2 weeks",
      "resources": ["Docker Official Tutorial", "Docker for Node.js Developers"],
      "description": "Learn containerization fundamentals and Dockerfile creation"
    }
  ]
}

Severity levels: "critical" (must-have, deal-breaker), "important" (strongly preferred), "nice-to-have" (bonus skill).
Priority: 1 (highest) to 5 (lowest).
Limit to top 8 skill gaps and 6 learning path items.`,
        },
        {
            role: "user",
            content: `Resume (truncated): ${resumeText.slice(0, 2000)}\n\nJob Description: ${jdText.slice(0, 1500)}\n\nTarget Role: ${role}`,
        },
    ]);

    try {
        return JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
        return {
            justification: `Your resume scored ${fitScore}/100 against this job description. Review the keyword analysis and suggestions for improvement.`,
            skillGaps: [],
            learningPath: [],
        };
    }
};

// ── AI: Comprehensive suggestions ────────────────────────────────────────────
const generateSuggestions = async (resumeText, jdText, missingKeywords) => {
    const suggestionsRaw = await askAi([
        {
            role:    "system",
            content: `You are an expert ATS consultant. Analyze the resume against the job description.
Return ONLY JSON:
{
  "missingKeywordsToAdd": [
    { "keyword": "Docker", "context": "Add to Skills section", "suggestedBullet": "Containerized applications using Docker" }
  ],
  "weakBullets": [
    { "original": "Worked on React", "issue": "Vague, no metrics", "improved": "Built 15+ reusable React components reducing development time by 30%" }
  ],
  "topSuggestions": ["Add quantified achievements", "Include missing keywords in Skills"],
  "summaryFeedback": "2-3 sentence overall assessment"
}`,
        },
        {
            role:    "user",
            content: `Resume: ${resumeText.slice(0, 2000)}\n\nJob Description: ${jdText.slice(0, 1500)}\n\nMissing keywords: ${missingKeywords.slice(0, 15).join(", ")}`,
        },
    ]);

    try {
        return JSON.parse(suggestionsRaw.replace(/```json|```/g, "").trim());
    } catch {
        return { missingKeywordsToAdd: [], weakBullets: [], topSuggestions: [], summaryFeedback: "" };
    }
};

// ── Role-specific weighted scoring ────────────────────────────────────────────
const getRoleWeights = (role = "") => {
    const r = role.toLowerCase();
    if (r.includes("frontend") || r.includes("react") || r.includes("ui"))
        return { technical: 0.45, soft: 0.10, tools: 0.25, format: 0.20 };
    if (r.includes("backend") || r.includes("node") || r.includes("api"))
        return { technical: 0.50, soft: 0.10, tools: 0.20, format: 0.20 };
    if (r.includes("data") || r.includes("ml") || r.includes("ai"))
        return { technical: 0.50, soft: 0.05, tools: 0.30, format: 0.15 };
    if (r.includes("manager") || r.includes("product") || r.includes("pm"))
        return { technical: 0.20, soft: 0.40, tools: 0.20, format: 0.20 };
    if (r.includes("devops") || r.includes("cloud") || r.includes("infra"))
        return { technical: 0.40, soft: 0.10, tools: 0.35, format: 0.15 };
    // Default
    return { technical: 0.40, soft: 0.15, tools: 0.25, format: 0.20 };
};

// ── Industry benchmark ────────────────────────────────────────────────────────
const getBenchmark = (score, role = "") => {
    const r = role.toLowerCase();
    let avg = 65, top10 = 88, top25 = 78;
    if (r.includes("senior") || r.includes("lead")) { avg = 70; top10 = 91; top25 = 82; }
    if (r.includes("fresher") || r.includes("junior")) { avg = 55; top10 = 80; top25 = 68; }

    let percentile = "Below average";
    if (score >= top10)  percentile = "Top 10%";
    else if (score >= top25) percentile = "Top 25%";
    else if (score >= avg)   percentile = "Above average";

    return { avg, top10, top25, percentile, gap: Math.max(0, top10 - score) };
};


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROUTE HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


// ── POST /ats/analyze — Full pipeline ─────────────────────────────────────────
const analyzeATS = async (req, res) => {
    const filepath = req.file?.path;
    try {
        const { jdText, role } = req.body;
        if (!req.file) return res.status(400).json({ message: "Resume PDF required" });
        if (!jdText?.trim()) return res.status(400).json({ message: "Job description required" });

        // 1. Extract resume text from PDF
        const resumeText = await extractPdfText(filepath);

        // 2. NLP Pipeline — TF-IDF + Cosine Similarity + Skill Extraction
        const nlpResult = computeFitScore(resumeText, jdText);

        // 3. AI Keyword extraction (supplements NLP extraction)
        const aiKeywords = await extractKeywordsAI(jdText);
        const effectiveRole = role || aiKeywords.role || "Software Engineer";

        // 4. Merge NLP + AI keywords for comprehensive matching
        const resumeLower = resumeText.toLowerCase();
        const allAiKeywords = [
            ...(aiKeywords.technical      || []),
            ...(aiKeywords.tools          || []),
            ...(aiKeywords.soft           || []),
            ...(aiKeywords.qualifications || []),
        ];

        // Enhanced matching: combine NLP pipeline results with AI keyword matching
        const aiMatched = [];
        const aiMissing = [];
        allAiKeywords.forEach(kw => {
            const kwLower = kw.toLowerCase();
            if (resumeLower.includes(kwLower)) {
                aiMatched.push(kw);
            } else {
                const words = kwLower.split(/\s+/);
                const anyMatch = words.some(w => w.length > 3 && resumeLower.includes(w));
                if (anyMatch) aiMatched.push(kw);
                else aiMissing.push(kw);
            }
        });

        // 5. Detect resume sections via AI
        const sectionData = await detectSections(resumeText);

        // 6. Role-specific weighted scoring
        const weights    = getRoleWeights(effectiveRole);
        const techScore  = nlpResult.keywordMatchScore;
        const toolScore  = nlpResult.keywordMatchScore; // simplified
        const softScore  = Math.round(
            (nlpResult.keywords.categories.jd.soft.length > 0
                ? nlpResult.keywords.categories.jd.soft.filter(s =>
                    resumeLower.includes(s.toLowerCase())
                ).length / nlpResult.keywords.categories.jd.soft.length
                : 0.7) * 100
        );
        const fmtScore   = sectionData.format?.score || 70;

        const weightedScore = Math.round(
            techScore  * weights.technical +
            softScore  * weights.soft      +
            toolScore  * weights.tools     +
            fmtScore   * weights.format
        );

        // Final score: blend NLP fit score with weighted AI score
        const finalScore = Math.round(nlpResult.fitScore * 0.4 + weightedScore * 0.6);

        // 7. Benchmark
        const benchmark = getBenchmark(finalScore, effectiveRole);

        // 8. Combine all missing keywords
        const allMissing = [...new Set([...nlpResult.keywords.missing, ...aiMissing])];
        const allMatched = [...new Set([...nlpResult.keywords.matched, ...aiMatched])];

        // 9. LLM Analysis — justification + skill gaps + learning path
        const llmAnalysis = await generateLLMAnalysis(
            resumeText, jdText, finalScore, allMissing, effectiveRole
        );

        // 10. AI Suggestions
        const suggestions = await generateSuggestions(resumeText, jdText, allMissing);

        // 11. Clean up uploaded file
        if (filepath) fs.unlinkSync(filepath);

        // 12. Save to MongoDB
        const analysisDoc = await ATSAnalysis.create({
            userId:            req.result._id,
            resumeText:        resumeText.slice(0, 10000),
            jdText:            jdText.slice(0, 5000),
            role:              effectiveRole,
            fitScore:          finalScore,
            similarityScore:   nlpResult.similarityScore,
            keywordMatchScore: nlpResult.keywordMatchScore,
            formatScore:       fmtScore,
            keywordAnalysis: {
                matched:    allMatched,
                missing:    allMissing,
                partial:    nlpResult.keywords.partial || [],
                total:      allAiKeywords.length + nlpResult.keywords.total,
                categories: nlpResult.keywords.categories,
            },
            sectionScores:   sectionData.sections || {},
            formatAnalysis:  sectionData.format || {},
            benchmark,
            suggestions: {
                missingKeywords: suggestions.missingKeywordsToAdd || [],
                weakBullets:     suggestions.weakBullets           || [],
                topSuggestions:  suggestions.topSuggestions        || [],
                summary:         suggestions.summaryFeedback       || "",
            },
            llmJustification: llmAnalysis.justification || "",
            skillGaps:        llmAnalysis.skillGaps      || [],
            learningPath:     llmAnalysis.learningPath   || [],
            tfidfMeta:        nlpResult.tfidf,
        });

        // 13. Send response
        res.json({
            _id:               analysisDoc._id,
            score:             finalScore,
            similarityScore:   nlpResult.similarityScore,
            keywordMatchScore: nlpResult.keywordMatchScore,
            role:              effectiveRole,
            keywords: {
                matched:    allMatched,
                missing:    allMissing,
                partial:    nlpResult.keywords.partial || [],
                score:      nlpResult.keywordMatchScore,
                total:      allAiKeywords.length,
                categories: nlpResult.keywords.categories,
            },
            sections:        sectionData.sections || {},
            format:          sectionData.format   || {},
            benchmark,
            suggestions: {
                missingKeywords: suggestions.missingKeywordsToAdd || [],
                weakBullets:     suggestions.weakBullets           || [],
                topSuggestions:  suggestions.topSuggestions        || [],
                summary:         suggestions.summaryFeedback       || "",
            },
            llmJustification: llmAnalysis.justification || "",
            skillGaps:        llmAnalysis.skillGaps      || [],
            learningPath:     llmAnalysis.learningPath   || [],
            tfidfMeta:        nlpResult.tfidf,
            resumeText:       resumeText.slice(0, 500),
        });

    } catch (err) {
        if (filepath && fs.existsSync(filepath)) fs.unlinkSync(filepath);
        console.error("[analyzeATS]", err.message);
        res.status(500).json({ message: `ATS analysis failed: ${err.message}` });
    }
};


// ── POST /ats/rewrite ─────────────────────────────────────────────────────────
const rewriteBullet = async (req, res) => {
    try {
        const { bullet, role, keywords } = req.body;
        if (!bullet?.trim()) return res.status(400).json({ message: "Bullet point required" });

        const result = await askAi([
            {
                role:    "system",
                content: `You are an expert resume writer. Rewrite this resume bullet point to be:
1. ATS-optimized (include relevant keywords)
2. Quantified (add metrics where possible)
3. Action-verb led
4. Concise (max 20 words)

Return ONLY JSON:
{
  "rewritten": "...",
  "improvements": ["Added metric", "Stronger action verb", "Added keyword X"],
  "atsScore": 85
}`,
            },
            {
                role:    "user",
                content: `Bullet: ${bullet}\nRole: ${role || "Software Engineer"}\nKeywords to include: ${(keywords || []).slice(0, 8).join(", ")}`,
            },
        ]);

        const parsed = JSON.parse(result.replace(/```json|```/g, "").trim());
        res.json(parsed);
    } catch (err) {
        console.error("[rewriteBullet]", err.message);
        res.status(500).json({ message: "Rewrite failed" });
    }
};


// ── POST /ats/extract-jd ─────────────────────────────────────────────────────
const extractJD = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url?.trim()) return res.status(400).json({ message: "URL required" });

        const response = await axios.get(
            `https://r.jina.ai/${encodeURIComponent(url)}`,
            {
                headers: { Accept: "text/plain" },
                timeout: 10000,
            }
        );

        const text = response.data || "";
        if (!text.trim()) return res.status(400).json({ message: "Could not extract JD from URL. Please paste the text manually." });

        const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 3000);
        res.json({ jdText: cleaned });

    } catch (err) {
        console.error("[extractJD]", err.message);
        res.status(400).json({ message: "Could not extract from this URL. Please paste the job description text manually." });
    }
};


// ── GET /ats/history — User's past analyses ───────────────────────────────────
const getHistory = async (req, res) => {
    try {
        const analyses = await ATSAnalysis.find({ userId: req.result._id })
            .select("role fitScore similarityScore keywordMatchScore createdAt")
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.json({ analyses });
    } catch (err) {
        console.error("[getHistory]", err.message);
        res.status(500).json({ message: "Failed to fetch history" });
    }
};


// ── GET /ats/analysis/:id — Single analysis detail ────────────────────────────
const getAnalysis = async (req, res) => {
    try {
        const analysis = await ATSAnalysis.findOne({
            _id: req.params.id,
            userId: req.result._id,
        }).lean();

        if (!analysis) return res.status(404).json({ message: "Analysis not found" });

        res.json(analysis);
    } catch (err) {
        console.error("[getAnalysis]", err.message);
        res.status(500).json({ message: "Failed to fetch analysis" });
    }
};


// ── DELETE /ats/analysis/:id — Delete analysis ────────────────────────────────
const deleteAnalysis = async (req, res) => {
    try {
        const result = await ATSAnalysis.findOneAndDelete({
            _id: req.params.id,
            userId: req.result._id,
        });

        if (!result) return res.status(404).json({ message: "Analysis not found" });

        res.json({ message: "Analysis deleted" });
    } catch (err) {
        console.error("[deleteAnalysis]", err.message);
        res.status(500).json({ message: "Failed to delete analysis" });
    }
};


module.exports = { upload, analyzeATS, rewriteBullet, extractJD, getHistory, getAnalysis, deleteAnalysis };