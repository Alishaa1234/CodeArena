const mongoose = require('mongoose');

// ── Per-problem solve record (embedded in each player) ────────────────────────
const solvedProblemSchema = new mongoose.Schema({
    problemId:  { type: mongoose.Schema.Types.ObjectId, ref: 'problem', required: true },
    points:     { type: Number, required: true },
    solvedAt:   { type: Date,   default: null },
    code:       { type: String, default: '' },
    language:   { type: String, default: '' },
}, { _id: false });

// ── Per-player record ─────────────────────────────────────────────────────────
const playerSchema = new mongoose.Schema({
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    username:    { type: String, required: true },
    eloAtStart:  { type: Number, required: true },
    eloAfter:    { type: Number, default: null },
    eloDelta:    { type: Number, default: null },
    totalPoints: { type: Number, default: 0 },
    solved:      { type: [solvedProblemSchema], default: [] },
    status:      { type: String, enum: ['waiting', 'coding', 'won', 'lost', 'draw'], default: 'waiting' },
}, { _id: false });

// ── Problem slot ──────────────────────────────────────────────────────────────
const duelProblemSchema = new mongoose.Schema({
    problemId:  { type: mongoose.Schema.Types.ObjectId, ref: 'problem', required: true },
    title:      { type: String, required: true },
    difficulty: { type: String, required: true },
    points:     { type: Number, required: true },
}, { _id: false });

// ── Duel ──────────────────────────────────────────────────────────────────────
const duelSchema = new mongoose.Schema({
    roomCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    problems:         { type: [duelProblemSchema], required: true },
    timeLimitSeconds: { type: Number, required: true },
    players:          { type: [playerSchema], validate: v => v.length === 2 },
    status: {
        type: String,
        enum: ['waiting', 'active', 'finished', 'abandoned'],
        default: 'waiting',
    },
    winnerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    isDraw:     { type: Boolean, default: false },
    startedAt:  { type: Date, default: null },
    finishedAt: { type: Date, default: null },
}, { timestamps: true });

duelSchema.methods.getPlayer = function (userId) {
    return this.players.find(p => p.userId.equals(userId));
};

duelSchema.methods.maxPoints = function () {
    return this.problems.reduce((sum, p) => sum + p.points, 0);
};

module.exports = mongoose.model('Duel', duelSchema);