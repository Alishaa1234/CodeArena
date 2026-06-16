const User       = require("../models/user");
const Submission = require("../models/submission");
const Problem    = require("../models/problem");
const Interview  = require("../models/interview");

// ── Helper: calculate streak from array of dates ──────────────────────────────
const calcStreak = (dates) => {
    if (!dates.length) return { current: 0, max: 0 };

    // Get unique local date strings sorted descending
    const unique = [...new Set(
        dates.map(d => {
            const dt = new Date(d);
            return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
        })
    )].sort().reverse();

    const today     = new Date();
    const todayKey  = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
    const yestKey   = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;

    // Current streak must start from today or yesterday
    let current = 0;
    if (unique[0] === todayKey || unique[0] === yestKey) {
        let prev = new Date(unique[0] + 'T12:00:00');
        current = 1;
        for (let i = 1; i < unique.length; i++) {
            const curr = new Date(unique[i] + 'T12:00:00');
            const diff = Math.round((prev - curr) / (1000 * 60 * 60 * 24));
            if (diff === 1) { current++; prev = curr; }
            else break;
        }
    }

    // Max streak
    let max = 1, running = 1;
    for (let i = 1; i < unique.length; i++) {
        const a = new Date(unique[i-1] + 'T12:00:00');
        const b = new Date(unique[i]   + 'T12:00:00');
        if (Math.round((a - b) / (1000*60*60*24)) === 1) {
            running++;
            max = Math.max(max, running);
        } else {
            running = 1;
        }
    }

    return { current, max };
};

// ── GET /profile/me ───────────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
    try {
        const userId = req.result._id;

        const user = await User.findById(userId).select(
            "firstName lastName emailId role createdAt eloRating duelsPlayed avatarUrl googleId"
        );
        if (!user) return res.status(404).json({ message: "User not found" });

        // ── Submissions ───────────────────────────────────────────────────────
        const submissions = await Submission.find({ userId })
            .populate("problemId", "difficulty title")
            .sort({ createdAt: -1 });

        const totalSubmissions    = submissions.length;
        const acceptedSubmissions = submissions.filter(s => s.status === "accepted").length;
        const acceptanceRate      = totalSubmissions
            ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
            : 0;

        // ── Difficulty stats ──────────────────────────────────────────────────
        const solvedSet = new Set(
            submissions.filter(s => s.status === "accepted").map(s => s.problemId?._id?.toString())
        );
        const solvedProblems = await Problem.find({ _id: { $in: [...solvedSet] } }).select("difficulty");
        const stats = { easy: 0, medium: 0, hard: 0, total: 0 };
        solvedProblems.forEach(p => {
            if (stats[p.difficulty] !== undefined) { stats[p.difficulty]++; stats.total++; }
        });

        // ── DSA Streak ────────────────────────────────────────────────────────
        const submissionDates = submissions
            .filter(s => s.status === "accepted")
            .map(s => s.createdAt);
        const streaks = calcStreak(submissionDates);

        // ── Heatmap (last 365 days, all submissions) ──────────────────────────
        const heatmap = {};
        const cutoff  = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1);
        submissions
            .filter(s => new Date(s.createdAt) >= cutoff)
            .forEach(s => {
                const d   = new Date(s.createdAt);
                const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                heatmap[key] = (heatmap[key] || 0) + 1;
            });

        // ── Recent submissions ────────────────────────────────────────────────
        const recentSubmissions = submissions.slice(0, 10).map(s => ({
            _id:          s._id,
            problemId:    s.problemId?._id,
            problemTitle: s.problemId?.title || "Unknown",
            difficulty:   s.problemId?.difficulty || "easy",
            status:       s.status,
            language:     s.language,
            createdAt:    s.createdAt,
        }));

        // ── Interview streak ──────────────────────────────────────────────────
        const interviews = await Interview.find({ userId })
            .select("createdAt status finalScore")
            .sort({ createdAt: -1 });

        const completedInterviews  = interviews.filter(i => i.status === "completed");
        const interviewDates       = completedInterviews.map(i => i.createdAt);
        const interviewStreakData  = calcStreak(interviewDates);
        const interviewStreak      = {
            current: interviewStreakData.current,
            max:     interviewStreakData.max,
            total:   completedInterviews.length,
            avgScore: completedInterviews.length
                ? Number((completedInterviews.reduce((a, b) => a + (b.finalScore || 0), 0) / completedInterviews.length).toFixed(1))
                : 0,
        };

        res.json({
            user,
            stats,
            streaks,
            heatmap,
            totalSubmissions,
            acceptedSubmissions,
            acceptanceRate,
            recentSubmissions,
            interviewStreak,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getProfile };