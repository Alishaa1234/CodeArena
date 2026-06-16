const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * ATS Analysis — stores full analysis results per user.
 * Each analysis captures the NLP pipeline output, LLM justifications,
 * skill gap analysis, and personalized learning path.
 */
const atsAnalysisSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "user",
            required: true,
            index: true,
        },

        // ── Input Data ────────────────────────────────────────────
        resumeText: { type: String, required: true },
        jdText:     { type: String, required: true },
        role:       { type: String, default: "Software Engineer" },

        // ── Scores ───────────────────────────────────────────────
        fitScore:          { type: Number, min: 0, max: 100, required: true },
        similarityScore:   { type: Number, min: 0, max: 100 },  // TF-IDF cosine
        keywordMatchScore: { type: Number, min: 0, max: 100 },  // Keyword hit rate
        formatScore:       { type: Number, min: 0, max: 100 },  // ATS format quality

        // ── Keyword Analysis ─────────────────────────────────────
        keywordAnalysis: {
            matched:  [{ type: String }],
            missing:  [{ type: String }],
            partial:  [{ type: String }],
            total:    { type: Number, default: 0 },
            categories: {
                resume: {
                    technical:      [{ type: String }],
                    soft:           [{ type: String }],
                    tools:          [{ type: String }],
                    qualifications: [{ type: String }],
                },
                jd: {
                    technical:      [{ type: String }],
                    soft:           [{ type: String }],
                    tools:          [{ type: String }],
                    qualifications: [{ type: String }],
                },
            },
        },

        // ── Section Scores ───────────────────────────────────────
        sectionScores: {
            type: Map,
            of: {
                present: { type: Boolean, default: false },
                score:   { type: Number, min: 0, max: 100 },
                issue:   { type: String, default: "" },
            },
        },

        // ── Format Analysis ──────────────────────────────────────
        formatAnalysis: {
            score:  { type: Number, min: 0, max: 100 },
            issues: [{ type: String }],
        },

        // ── Benchmark ────────────────────────────────────────────
        benchmark: {
            avg:        { type: Number },
            top10:      { type: Number },
            top25:      { type: Number },
            percentile: { type: String },
            gap:        { type: Number },
        },

        // ── AI-Generated Content ─────────────────────────────────
        suggestions: {
            missingKeywords: [{
                keyword:        { type: String },
                context:        { type: String },
                suggestedBullet:{ type: String },
            }],
            weakBullets: [{
                original: { type: String },
                issue:    { type: String },
                improved: { type: String },
            }],
            topSuggestions: [{ type: String }],
            summary:        { type: String },
        },

        // ── LLM Justification ────────────────────────────────────
        llmJustification: { type: String, default: "" },

        // ── Skill Gap Analysis ───────────────────────────────────
        skillGaps: [{
            skill:    { type: String },
            severity: { type: String, enum: ["critical", "important", "nice-to-have"] },
            reason:   { type: String },
            action:   { type: String },
        }],

        // ── Learning Path ────────────────────────────────────────
        learningPath: [{
            skill:        { type: String },
            priority:     { type: Number, min: 1 },
            timeEstimate: { type: String },     // e.g. "2 weeks"
            resources:    [{ type: String }],
            description:  { type: String },
        }],

        // ── TF-IDF Metadata ─────────────────────────────────────
        tfidfMeta: {
            vocabularySize:   { type: Number },
            resumeTokenCount: { type: Number },
            jdTokenCount:     { type: Number },
        },
    },
    {
        timestamps: true,
    }
);

// Index for fetching user's history sorted by date
atsAnalysisSchema.index({ userId: 1, createdAt: -1 });

const ATSAnalysis = mongoose.model("atsAnalysis", atsAnalysisSchema);
module.exports = ATSAnalysis;
