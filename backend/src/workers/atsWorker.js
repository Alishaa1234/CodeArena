const { Worker } = require("bullmq");
const fs   = require("fs");
const path = require("path");
const { connection } = require("../config/atsQueue");
const { computeFitScore, extractSkillEntities, computeSectionWeightedScore } = require("../utils/nlpPipeline");
const {
    detectProfile,
    getAdaptiveWeights,
    computeQuantifiedImpact,
    detectActionVerbs,
    generateFlags,
    PROFILE_STUDENT,
} = require("../utils/profileScorer");
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
    SCORING:     { stage: "scoring",     label: "Profile-aware scoring...",      percent: 55 },
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

        // 5. Detect resume sections via AI (enriched with experienceMonths + seniority)
        await job.updateProgress(STAGES.SECTIONS);
        const sectionData = await detectSections(resumeText);

        // ══════════════════════════════════════════════════════════════════════
        // 6. PROFILE-AWARE SCORING (Jobsy Integration)
        // All steps below are pure JS — no API calls, instant execution.
        // ══════════════════════════════════════════════════════════════════════
        await job.updateProgress(STAGES.SCORING);

        // 6a. Detect candidate profile (student / early_career / professional)
        const profileResult = detectProfile(resumeText, sectionData);
        const candidateProfile = profileResult.profile;

        // 6b. Get adaptive weights (merge profile-based + role-based)
        const baseRoleWeights = getRoleWeights(effectiveRole);
        const weights = getAdaptiveWeights(candidateProfile, baseRoleWeights);

        // 6c. Compute quantified impact score
        const impactResult = computeQuantifiedImpact(resumeText);

        // 6d. Detect action verbs
        const verbResult = detectActionVerbs(resumeText);

        // 6e. Generate profile-aware flags
        const flags = generateFlags(resumeText, sectionData, candidateProfile, impactResult, verbResult);

        // 6f. Section-weighted keyword scoring
        const allJdKeywords = [...allAiKeywords, ...nlpResult.keywords.matched, ...nlpResult.keywords.missing];
        const uniqueJdKeywords = [...new Set(allJdKeywords)];
        const sectionWeighted = computeSectionWeightedScore(resumeText, sectionData, uniqueJdKeywords);

        // 6g. Compute individual dimension scores
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

        // 6h. Action verb bonus for students without formal experience
        let actionVerbBonus = 0;
        if (candidateProfile === PROFILE_STUDENT && verbResult.hasStrongVerbs) {
            actionVerbBonus = 3; // +3 points for demonstrating active development work
        }

        // 6i. Weighted score using adaptive weights
        const weightedScore = Math.round(
            techScore * weights.technical +
            softScore * weights.soft      +
            toolScore * weights.tools     +
            fmtScore  * weights.format
        );

        // 6j. Section-weighted adjustment (blend 15% section-weighted score)
        const sectionAdjusted = Math.round(
            weightedScore * 0.85 +
            sectionWeighted.sectionWeightedScore * 0.15
        );

        // 6k. Final score = NLP fit * 0.4 + weighted * 0.6 + impact bonus + verb bonus
        const impactBonus = Math.round(impactResult.score * 0.5); // 0-5 point bonus
        const rawFinal = Math.round(nlpResult.fitScore * 0.4 + sectionAdjusted * 0.6) + impactBonus + actionVerbBonus;
        const finalScore = Math.min(100, Math.max(0, rawFinal));
        const benchmark  = getBenchmark(finalScore, effectiveRole);

        const allMissing = [...new Set([...nlpResult.keywords.missing, ...aiMissing])];
        const allMatched = [...new Set([...nlpResult.keywords.matched, ...aiMatched])];

        // 7. LLM Analysis — justification + skill gaps + learning path (profile-aware)
        await job.updateProgress(STAGES.LLM);
        const llmAnalysis = await generateLLMAnalysis(
            resumeText, jdText, finalScore, allMissing, effectiveRole, candidateProfile
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
            // ── Profile-Aware Fields (new) ──────────────────────────
            candidateProfile,
            flags,
            quantifiedImpact: impactResult,
            actionVerbs:      verbResult,
            profileSignals:   profileResult.signals,
            // ── Suggestions & AI Analysis ────────────────────────────
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

    console.log("[ATS Worker] Started — listening for ats-analysis jobs (profile-aware scoring v2)");
    return worker;
};

module.exports = { startATSWorker };
