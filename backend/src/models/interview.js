const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    question:      String,
    difficulty:    String,
    timeLimit:     Number,
    answer:        String,
    feedback:      String,
    score:         { type: Number, default: 0 },
    confidence:    { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    correctness:   { type: Number, default: 0 },
    // ── Speech intelligence metrics ──────────────────────────
    fillerCount:   { type: Number, default: 0 },
    wpm:           { type: Number, default: 0 },
    starScore:     { type: Number, default: 0 },
});

const interviewSchema = new mongoose.Schema({
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      "User",
        required: true,
    },
    role:        { type: String, required: true },
    experience:  { type: String, required: true },
    mode:        { type: String, enum: ["HR", "Technical", "Coding"], required: true },
    resumeText:  { type: String },
    questions:   [questionSchema],
    finalScore:  { type: Number, default: 0 },
    status: {
        type:    String,
        enum:    ["Incompleted", "completed"],
        default: "Incompleted",
    },
    // ── Adaptive questioning context ─────────────────────────
    totalQuestions: { type: Number, default: 5 },
    context: {
        projects:   [String],
        skills:     [String],
        difficulty: { type: String, default: "Medium" },
    },
}, { timestamps: true });

const Interview = mongoose.model("Interview", interviewSchema);

module.exports = Interview;