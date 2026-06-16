const { Worker } = require("bullmq");
const fs   = require("fs");
const path = require("path");
const { connection } = require("../config/atsQueue");
const { computeFitScore, extractSkillEntities } = require("../utils/nlpPipeline");
const ATSAnalysis = require("../models/atsAnalysis");

// Import all the pipeline helper functions from the controller
const {
    extractPdfText,
    extractKeywordsAI,
    detectSections,
    generateLLMAnalysis,
    generateSuggestions,
    getRoleWeights,
    getBenchmark,
} = require("../controllers/atsController");

// ── Job processing stages ─────────────────────────────────────────────────────
const STAGES = {
    PARSING:     { stage: "parsing",     label: "Parsing PDF...",                percent: 5  },
    NLP:         { stage: "nlp",         label: "Running NLP pipeline...",       percent: 15 },
    KEYWORDS:    { stage: "keywords",    label: "Extracting keywords with AI...",percent: 30 },
    SECTIONS:    { stage: "sections",    label: "Analyzing resume sections...",  percent: 45 },
    SCORING:     { stage: "scoring",     label: "Computing weighted scores...",  percent: 55 },
    LLM:         { stage: "llm",         label: "Generating AI analysis...",     percent: 70 },
    SUGGESTIONS: { stage: "suggestions", label: "Building recommendations...",   percent: 85 },
    SAVING:      { stage: "saving",      label: "Saving report...",             percent: 95 },
};

// ── The main processor ────────────────────────────────────────────────────────
const processATSJob = async (job) => {
    const { filepath, jdText, role, userId } = job.data;

    try {
        // 1. Parse PDF
        await job.updateProgress(STAGES.PARSING);
        const resumeText = await extractPdfText(filepath);

        // 2. NLP Pipeline — TF-IDF + Cosine Similarity + Skill Extraction
        await job.updateProgress(STAGES.NLP);
        const nlpResult = computeFitScore(resumeText, jdText);

        // 3. AI Keyword extraction
        await job.updateProgress(STAGES.KEYWORDS);
        const aiKeywords    = await extractKeywordsAI(jdText);
        const effectiveRole = role || aiKeywords.role || "Software Engineer";

        // 4. Merge NLP + AI keywords
        const resumeLower   = resumeText.toLowerCase();
        const allAiKeywords = [
            ...(aiKeywords.technical      || []),
            ...(aiKeywords.tools          || []),
            ...(aiKeywords.soft           || []),
            ...(aiKeywords.qualifications || []),
        ];

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
        await job.updateProgress(STAGES.SECTIONS);
        const sectionData = await detectSections(resumeText);

        // 6. Role-specific weighted scoring
        await job.updateProgress(STAGES.SCORING);
        const weights   = getRoleWeights(effectiveRole);
        const techScore = nlpResult.keywordMatchScore;
        const toolScore = nlpResult.keywordMatchScore;
        const softScore = Math.round(
            (nlpResult.keywords.categories.jd.soft.length > 0
                ? nlpResult.keywords.categories.jd.soft.filter(s =>
                    resumeLower.includes(s.toLowerCase())
                ).length / nlpResult.keywords.categories.jd.soft.length
                : 0.7) * 100
        );
        const fmtScore = sectionData.format?.score || 70;

        const weightedScore = Math.round(
            techScore * weights.technical +
            softScore * weights.soft      +
            toolScore * weights.tools     +
            fmtScore  * weights.format
        );

        const finalScore = Math.round(nlpResult.fitScore * 0.4 + weightedScore * 0.6);
        const benchmark  = getBenchmark(finalScore, effectiveRole);

        const allMissing = [...new Set([...nlpResult.keywords.missing, ...aiMissing])];
        const allMatched = [...new Set([...nlpResult.keywords.matched, ...aiMatched])];

        // 7. LLM Analysis — justification + skill gaps + learning path
        await job.updateProgress(STAGES.LLM);
        const llmAnalysis = await generateLLMAnalysis(
            resumeText, jdText, finalScore, allMissing, effectiveRole
        );

        // 8. AI Suggestions
        await job.updateProgress(STAGES.SUGGESTIONS);
        const suggestions = await generateSuggestions(resumeText, jdText, allMissing);

        // 9. Clean up uploaded file
        if (filepath && fs.existsSync(filepath)) fs.unlinkSync(filepath);

        // 10. Save to MongoDB
        await job.updateProgress(STAGES.SAVING);
        const analysisDoc = await ATSAnalysis.create({
            userId,
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
            learningPath:     (llmAnalysis.learningPath || []).map(item => ({
                ...item,
                priority: Math.min(Math.max(item.priority || 1, 1), 5),
            })),
            tfidfMeta:        nlpResult.tfidf,
        });

        // Return the analysis ID so the client can fetch the full report
        return { analysisId: analysisDoc._id.toString() };

    } catch (err) {
        // Clean up file on failure
        if (filepath && fs.existsSync(filepath)) {
            try { fs.unlinkSync(filepath); } catch { /* ignore cleanup errors */ }
        }
        throw err; // Re-throw so BullMQ marks job as failed
    }
};

// ── Start the worker ──────────────────────────────────────────────────────────
let worker = null;

const startATSWorker = () => {
    worker = new Worker("ats-analysis", processATSJob, {
        connection,
        concurrency: 2, // Process up to 2 ATS jobs at once
    });

    worker.on("completed", (job, result) => {
        console.log(`[ATS Worker] Job ${job.id} completed → analysis ${result.analysisId}`);
    });

    worker.on("failed", (job, err) => {
        console.error(`[ATS Worker] Job ${job?.id} failed:`, err.message);
    });

    console.log("[ATS Worker] Started — listening for ats-analysis jobs");
    return worker;
};

module.exports = { startATSWorker };
