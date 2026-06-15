const fs      = require("fs");
const path    = require("path");
const axios   = require("axios");
const multer  = require("multer");

let pdfjsLib;
try { pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js"); } catch { pdfjsLib = null; }

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

// ── OpenRouter ────────────────────────────────────────────────────────────────
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

// ── Keyword extraction (Level 2) ──────────────────────────────────────────────
const extractKeywords = async (jdText) => {
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

// ── Exact + fuzzy keyword matching ────────────────────────────────────────────
const matchKeywords = (resumeText, keywords) => {
    const resume  = resumeText.toLowerCase();
    const matched = [];
    const missing = [];

    const allKeywords = [
        ...(keywords.technical      || []),
        ...(keywords.tools          || []),
        ...(keywords.soft           || []),
        ...(keywords.qualifications || []),
    ];

    allKeywords.forEach(kw => {
        const kwLower = kw.toLowerCase();
        // Exact match
        if (resume.includes(kwLower)) {
            matched.push(kw);
        } else {
            // Fuzzy: check if any word in kw appears in resume
            const words  = kwLower.split(/\s+/);
            const anyMatch = words.some(w => w.length > 3 && resume.includes(w));
            if (anyMatch) matched.push(kw);
            else missing.push(kw);
        }
    });

    const score = allKeywords.length
        ? Math.round((matched.length / allKeywords.length) * 100)
        : 0;

    return { matched, missing, score, total: allKeywords.length };
};

// ── Section detection ─────────────────────────────────────────────────────────
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

// ── POST /ats/analyze ─────────────────────────────────────────────────────────
const analyzeATS = async (req, res) => {
    const filepath = req.file?.path;
    try {
        const { jdText, role } = req.body;
        if (!req.file) return res.status(400).json({ message: "Resume PDF required" });
        if (!jdText?.trim()) return res.status(400).json({ message: "Job description required" });

        // 1. Extract resume text
        const resumeText = await extractPdfText(filepath);

        // 2. Extract JD keywords
        const keywords = await extractKeywords(jdText);
        const effectiveRole = role || keywords.role || "Software Engineer";

        // 3. Match keywords
        const keywordMatch = matchKeywords(resumeText, keywords);

        // 4. Detect resume sections
        const sectionData = await detectSections(resumeText);

        // 5. Role-specific weighted score
        const weights    = getRoleWeights(effectiveRole);
        const techScore  = keywordMatch.score;
        const toolScore  = keywordMatch.score; // simplified
        const softScore  = matchKeywords(resumeText, { technical: keywords.soft || [] }).score;
        const fmtScore   = sectionData.format?.score || 70;

        const finalScore = Math.round(
            techScore  * weights.technical +
            softScore  * weights.soft      +
            toolScore  * weights.tools     +
            fmtScore   * weights.format
        );

        // 6. Benchmark
        const benchmark = getBenchmark(finalScore, effectiveRole);

        // 7. AI comprehensive suggestions
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
                content: `Resume: ${resumeText.slice(0, 2000)}\n\nJob Description: ${jdText.slice(0, 1500)}\n\nMissing keywords: ${keywordMatch.missing.slice(0, 15).join(", ")}`,
            },
        ]);

        let suggestions = {};
        try {
            suggestions = JSON.parse(suggestionsRaw.replace(/```json|```/g, "").trim());
        } catch {
            suggestions = { missingKeywordsToAdd: [], weakBullets: [], topSuggestions: [], summaryFeedback: "" };
        }

        if (filepath) fs.unlinkSync(filepath);

        res.json({
            score:         finalScore,
            role:          effectiveRole,
            keywords: {
                matched:  keywordMatch.matched,
                missing:  keywordMatch.missing,
                score:    keywordMatch.score,
                total:    keywordMatch.total,
            },
            sections:      sectionData.sections || {},
            format:        sectionData.format   || {},
            benchmark,
            suggestions: {
                missingKeywords: suggestions.missingKeywordsToAdd || [],
                weakBullets:     suggestions.weakBullets           || [],
                topSuggestions:  suggestions.topSuggestions        || [],
                summary:         suggestions.summaryFeedback       || "",
            },
            resumeText: resumeText.slice(0, 500), // for before/after
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

// ── POST /ats/extract-jd ──────────────────────────────────────────────────────
// Best-effort JD extraction from URL using a public proxy
const extractJD = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url?.trim()) return res.status(400).json({ message: "URL required" });

        // Use a public text extraction service
        const response = await axios.get(
            `https://r.jina.ai/${encodeURIComponent(url)}`,
            {
                headers: { Accept: "text/plain" },
                timeout: 10000,
            }
        );

        const text = response.data || "";
        if (!text.trim()) return res.status(400).json({ message: "Could not extract JD from URL. Please paste the text manually." });

        // Clean up and return first 3000 chars
        const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 3000);
        res.json({ jdText: cleaned });

    } catch (err) {
        console.error("[extractJD]", err.message);
        res.status(400).json({ message: "Could not extract from this URL. Please paste the job description text manually." });
    }
};

module.exports = { upload, analyzeATS, rewriteBullet, extractJD };