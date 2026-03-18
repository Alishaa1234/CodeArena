const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Duel = require('../models/Duel');
const User = require('../models/user');
const Problem = require('../models/problem');
const { redisClient } = require('../config/redis');

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// Pick N unique random problems from the DB
async function pickRandomProblems(count) {
    const total = await Problem.countDocuments();
    if (total < count) throw new Error(`Not enough problems in DB (need ${count}, have ${total})`);

    const problems = await Problem.aggregate([
        { $sample: { size: count } },
        { $project: { _id: 1, title: 1, difficulty: 1, points: 1 } },
    ]);
    return problems;
}

const ROOM_TTL_SECONDS = 600; // 10 min max waiting time before battle starts

// ── POST /duel/create ─────────────────────────────────────────────────────────
// Body: { timeLimitSeconds: number, questionCount: number }
// timeLimitSeconds: one of 300,600,900,1200,1800 or any custom value 60–7200
// questionCount: 1–5

router.post('/create', authMiddleware(), async (req, res, next) => {
    try {
        const user = req.result;

        // ── Validate inputs ───────────────────────────────────────────────────
        let { timeLimitSeconds, questionCount } = req.body;

        timeLimitSeconds = parseInt(timeLimitSeconds, 10);
        questionCount    = parseInt(questionCount,    10);

        if (isNaN(timeLimitSeconds) || timeLimitSeconds < 60 || timeLimitSeconds > 7200) {
            return res.status(400).json({ message: 'Time limit must be between 60 and 7200 seconds' });
        }
        if (isNaN(questionCount) || questionCount < 1 || questionCount > 5) {
            return res.status(400).json({ message: 'Question count must be between 1 and 5' });
        }

        // ── Pick problems ─────────────────────────────────────────────────────
        let problems;
        try {
            problems = await pickRandomProblems(questionCount);
        } catch (e) {
            return res.status(400).json({ message: e.message });
        }

        // ── Generate unique room code ─────────────────────────────────────────
        let roomCode;
        let attempts = 0;
        do {
            roomCode = generateRoomCode();
            const exists = await redisClient.get(`duel:${roomCode}`);
            if (!exists) break;
            attempts++;
        } while (attempts < 5);

        if (attempts >= 5) {
            return res.status(500).json({ message: 'Could not generate a unique room code, try again' });
        }

        // ── Build room state ──────────────────────────────────────────────────
        const problemSlots = problems.map(p => ({
            problemId:  p._id.toString(),
            title:      p.title,
            difficulty: p.difficulty,
            points:     p.points ?? 100,
        }));

        const totalPoints = problemSlots.reduce((s, p) => s + p.points, 0);

        const roomState = {
            roomCode,
            problems:         problemSlots,
            timeLimitSeconds,
            totalPoints,       // max possible points — used for early-end check
            status:           'waiting',
            host: {
                userId:      user._id.toString(),
                username:    `${user.firstName} ${user.lastName || ''}`.trim(),
                eloRating:   user.eloRating ?? 1200,
                totalPoints: 0,
                solved:      [],   // [{ problemId, points, solvedAt, code, language }]
                status:      'waiting',
            },
            guest: null,
        };

        await redisClient.setEx(`duel:${roomCode}`, ROOM_TTL_SECONDS, JSON.stringify(roomState));

        res.status(201).json({
            roomCode,
            problems: problemSlots,
            timeLimitSeconds,
            totalPoints,
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /duel/recap/:roomCode ─────────────────────────────────────────────────

router.get('/recap/:roomCode', authMiddleware(), async (req, res, next) => {
    try {
        const duel = await Duel.findOne({ roomCode: req.params.roomCode.toUpperCase() })
            .populate('problems.problemId', 'title difficulty points')
            .lean();

        if (!duel) return res.status(404).json({ message: 'Duel not found' });

        const isParticipant = duel.players.some(p => p.userId.equals(req.result._id));
        if (!isParticipant) return res.status(403).json({ message: 'Not your duel' });

        if (duel.status !== 'finished') {
            return res.status(400).json({ message: 'Duel is not finished yet' });
        }

        res.json({ duel });
    } catch (err) {
        next(err);
    }
});

// ── GET /duel/leaderboard ─────────────────────────────────────────────────────

router.get('/leaderboard', authMiddleware(), async (req, res, next) => {
    try {
        const users = await User.find({ duelsPlayed: { $gt: 0 } })
            .sort({ eloRating: -1 })
            .limit(20)
            .select('firstName lastName eloRating duelsPlayed');

        res.json({ leaderboard: users });
    } catch (err) {
        next(err);
    }
});

module.exports = router;