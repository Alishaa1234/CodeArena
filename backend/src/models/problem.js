const mongoose = require('mongoose');
const { Schema } = mongoose;

const problemSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        required: true,
    },
    tags: {
        type: [String],
        enum: ['array', 'linkedList', 'graph', 'dp', 'string', 'tree', 'math'],
        required: true,
    },
    visibleTestCases: [
        {
            input:       { type: String, required: true },
            output:      { type: String, required: true },
            explanation: { type: String, required: true },
        },
    ],
    hiddenTestCases: [
        {
            input:  { type: String, required: true },
            output: { type: String, required: true },
        },
    ],
    startCode: [
        {
            language:    { type: String, required: true },
            initialCode: { type: String, required: true },
        },
    ],
    referenceSolution: [
        {
            language:     { type: String, required: true },
            completeCode: { type: String, required: true },
        },
    ],
    problemCreator: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },

    // ── Constraints ──────────────────────────────────────────────────────────
    // List of constraint strings e.g. ["1 <= n <= 10^5", "0 <= nums[i] <= 10^4"]
    constraints: {
        type: [String],
        default: [],
    },

    // ── Duel points ───────────────────────────────────────────────────────────
    // Set by admin. Awarded in full on AC. Suggested: easy=100, medium=200, hard=300
    points: {
        type: Number,
        required: true,
        default: 100,
        min: 10,
        max: 1000,
    },
    // ─────────────────────────────────────────────────────────────────────────

}, {
    timestamps: true,
});

const Problem = mongoose.model('problem', problemSchema);
module.exports = Problem;