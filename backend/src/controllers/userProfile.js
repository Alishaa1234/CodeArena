const User = require("../models/user");
const Submission = require("../models/submission");
const Problem = require("../models/problem");

const getProfile = async (req, res, next) => {
    try {
        const userId = req.result._id;

        // Fetch user with solved problems populated
        const user = await User.findById(userId).populate({
            path: "problemSolved",
            select: "_id title difficulty tags",
        });

        // Fetch all submissions for this user
        const submissions = await Submission.find({ userId })
            .sort({ createdAt: -1 })
            .populate({ path: "problemId", select: "title difficulty" })
            .limit(100); // enough for heatmap + recent list

        // ── Stats breakdown ──────────────────────────────────────────
        const solved = user.problemSolved || [];
        const stats = { easy: 0, medium: 0, hard: 0, total: solved.length };
        solved.forEach((p) => {
            if (p.difficulty === "easy")   stats.easy++;
            else if (p.difficulty === "medium") stats.medium++;
            else if (p.difficulty === "hard")   stats.hard++;
        });

        // ── Heatmap data ─────────────────────────────────────────────
        // Count accepted submissions per calendar day (last 365 days)
        const heatmap = {};
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 1);

        submissions.forEach((sub) => {
            if (sub.status === "accepted" && new Date(sub.createdAt) >= cutoff) {
                const day = sub.createdAt.toISOString().slice(0, 10); // "YYYY-MM-DD"
                heatmap[day] = (heatmap[day] || 0) + 1;
            }
        });

        // ── Streak calculation ────────────────────────────────────────
        const activeDays = Object.keys(heatmap).sort();
        let currentStreak = 0;
        let maxStreak = 0;
        let streak = 0;

        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

        // Walk backwards from today
        let checkDay = activeDays.includes(today) ? today : yesterday;
        const daySet = new Set(activeDays);

        let d = new Date(checkDay);
        while (daySet.has(d.toISOString().slice(0, 10))) {
            currentStreak++;
            d.setDate(d.getDate() - 1);
        }

        // Max streak
        let tempStreak = 1;
        for (let i = 1; i < activeDays.length; i++) {
            const prev = new Date(activeDays[i - 1]);
            const curr = new Date(activeDays[i]);
            const diff = (curr - prev) / 86400000;
            if (diff === 1) {
                tempStreak++;
                maxStreak = Math.max(maxStreak, tempStreak);
            } else {
                tempStreak = 1;
            }
        }
        maxStreak = Math.max(maxStreak, tempStreak);

        // ── Recent submissions (last 8) ───────────────────────────────
        const recentSubmissions = submissions.slice(0, 8).map((sub) => ({
            _id: sub._id,
            problemTitle: sub.problemId?.title || "Unknown",
            problemId: sub.problemId?._id,
            difficulty: sub.problemId?.difficulty,
            status: sub.status,
            language: sub.language,
            runtime: sub.runtime,
            createdAt: sub.createdAt,
        }));

        // ── Total submissions count ───────────────────────────────────
        const totalSubmissions = await Submission.countDocuments({ userId });
        const acceptedSubmissions = await Submission.countDocuments({ userId, status: "accepted" });

        res.status(200).json({
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                emailId: user.emailId,
                role: user.role,
                createdAt: user.createdAt,
            },
            stats,
            streaks: { current: currentStreak, max: maxStreak },
            heatmap,
            recentSubmissions,
            totalSubmissions,
            acceptedSubmissions,
            acceptanceRate: totalSubmissions > 0
                ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
                : 0,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getProfile };