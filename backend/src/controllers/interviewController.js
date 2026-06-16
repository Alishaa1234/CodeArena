const fs       = require("fs");
const path     = require("path");
const multer   = require("multer");
const axios    = require("axios");
const Interview = require("../models/interview");

// ── PDF parsing ───────────────────────────────────────────────────────────────
// Using pdfjs-dist legacy build for Node.js
let pdfjsLib;
try {
    pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
} catch {
    pdfjsLib = null;
}

// ── OpenRouter call ───────────────────────────────────────────────────────────
const askAi = async (messages) => {
    const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        { model: "openai/gpt-4o-mini", messages },
        {
            headers: {
                Authorization:  `Bearer ${process.env.OPENROUTER_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title":      "DSA Practice Platform",
            },
        }
    );
    const content = response.data?.choices?.[0]?.message?.content;
    if (!content || !content.trim()) throw new Error("AI returned empty response");
    return content;
};

// ── Multer setup (resume uploads) ─────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "../../public");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") cb(null, true);
        else cb(new Error("Only PDF files allowed"));
    },
});

// ── POST /interview/resume ────────────────────────────────────────────────────
const analyzeResume = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Resume required" });

        const filepath   = req.file.path;
        const fileBuffer = await fs.promises.readFile(filepath);
        const uint8Array = new Uint8Array(fileBuffer);

        let resumeText = "";

        if (pdfjsLib) {
            const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page    = await pdf.getPage(pageNum);
                const content = await page.getTextContent();
                resumeText   += content.items.map(i => i.str).join(" ") + "\n";
            }
            resumeText = resumeText.replace(/\s+/g, " ").trim();
        }

        const messages = [
            {
                role:    "system",
                content: `Extract structured data from resume. Return strictly JSON:
{
  "role": "string",
  "experience": "string",
  "projects": ["project1"],
  "skills": ["skill1"]
}`,
            },
            { role: "user", content: resumeText || "No resume text extracted" },
        ];

        const aiResponse = await askAi(messages);
        const parsed     = JSON.parse(aiResponse);

        fs.unlinkSync(filepath);

        res.json({
            role:       parsed.role,
            experience: parsed.experience,
            projects:   parsed.projects,
            skills:     parsed.skills,
            resumeText,
        });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error("[analyzeResume]", error.message);
        res.status(500).json({ message: error.message });
    }
};

// ── POST /interview/generate-questions (Adaptive: only 1st question) ──────────
const generateQuestion = async (req, res) => {
    try {
        let { role, experience, mode, resumeText, projects, skills, difficulty } = req.body;

        role       = role?.trim();
        experience = experience?.trim();
        mode       = mode?.trim();

        if (!role || !experience || !mode) {
            return res.status(400).json({ message: "Role, experience and mode are required" });
        }

        const user = req.result;

        const projectText = Array.isArray(projects) && projects.length ? projects.join(", ") : "None";
        const skillsText  = Array.isArray(skills)   && skills.length   ? skills.join(", ")   : "None";
        const safeResume  = resumeText?.trim() || "None";

        const messages = [
            {
                role:    "system",
                content: `You are a real human interviewer conducting a professional interview.
Generate exactly 1 opening interview question.
Rules:
- The question must be 15-25 words.
- It must be a single complete sentence.
- Do NOT number it.
- Do NOT add explanations or extra text.
- Difficulty: easy (warm-up question).
Make the question based on role, experience, mode, projects, skills and resume.`,
            },
            {
                role:    "user",
                content: `Role:${role}\nExperience:${experience}\nMode:${mode}\nProjects:${projectText}\nSkills:${skillsText}\nResume:${safeResume}`,
            },
        ];

        const aiResponse = await askAi(messages);
        const firstQ     = aiResponse.split("\n").map(q => q.trim()).filter(q => q.length > 0)[0];

        if (!firstQ) {
            return res.status(500).json({ message: "AI failed to generate question" });
        }

        const interview = await Interview.create({
            userId:     user._id,
            role,
            experience,
            mode,
            resumeText: safeResume,
            totalQuestions: 5,
            context: {
                projects: Array.isArray(projects) ? projects : [],
                skills:   Array.isArray(skills)   ? skills   : [],
                difficulty: difficulty || "Medium",
            },
            questions: [{
                question:   firstQ,
                difficulty: "easy",
                timeLimit:  60,
            }],
        });

        res.json({
            interviewId:    interview._id,
            userName:       user.firstName,
            questions:      interview.questions,
            totalQuestions: interview.totalQuestions,
            adaptive:       true,
        });
    } catch (error) {
        console.error("[generateQuestion]", error.message);
        res.status(500).json({ message: `Failed to create interview: ${error.message}` });
    }
};

// ── POST /interview/generate-next (Adaptive next question) ────────────────────
const generateNextQuestion = async (req, res) => {
    try {
        const { interviewId } = req.body;
        const interview = await Interview.findById(interviewId);
        if (!interview) return res.status(404).json({ message: "Interview not found" });

        const qNum = interview.questions.length + 1;
        if (qNum > interview.totalQuestions) {
            return res.status(400).json({ message: "All questions already generated", done: true });
        }

        // Build rolling context from previous Q&A
        const history = interview.questions.map((q, i) => {
            const scoreInfo = q.score ? ` [Score: ${q.score}/10]` : "";
            return `Q${i + 1} (${q.difficulty}): ${q.question}${q.answer ? `\nAnswer: ${q.answer}${scoreInfo}` : ""}`;
        }).join("\n\n");

        // Compute average score trend to decide difficulty
        const answeredQs = interview.questions.filter(q => q.score > 0);
        const avgScore   = answeredQs.length
            ? answeredQs.reduce((a, b) => a + b.score, 0) / answeredQs.length
            : 5;

        let nextDifficulty;
        if (avgScore >= 8)      nextDifficulty = "hard";
        else if (avgScore >= 5) nextDifficulty = "medium";
        else                    nextDifficulty = "easy";

        // For later questions, always push harder
        if (qNum >= 4) nextDifficulty = "hard";
        else if (qNum >= 3 && nextDifficulty === "easy") nextDifficulty = "medium";

        const timeLimits = { easy: 60, medium: 90, hard: 120 };

        const projectText = interview.context?.projects?.join(", ") || "None";
        const skillsText  = interview.context?.skills?.join(", ")   || "None";

        const messages = [
            {
                role: "system",
                content: `You are a professional interviewer conducting question ${qNum} of ${interview.totalQuestions}.
The candidate's average score so far is ${avgScore.toFixed(1)}/10.

Generate exactly 1 ${nextDifficulty}-level interview question.
Rules:
- 15-25 words, single complete sentence.
- Do NOT repeat any previous question.
- ${avgScore < 5 ? "The candidate is struggling. Ask a simpler question to build confidence, but on a different topic." : ""}
- ${avgScore >= 8 ? "The candidate is performing excellently. Ask a challenging, deep question that tests advanced knowledge." : ""}
- ${avgScore >= 5 && avgScore < 8 ? "Ask a progressively harder question to test their depth." : ""}
- Base the question on their weakest area from the history below.
- Return ONLY the question text, nothing else.`,
            },
            {
                role: "user",
                content: `Role: ${interview.role}\nExperience: ${interview.experience}\nMode: ${interview.mode}\nProjects: ${projectText}\nSkills: ${skillsText}\n\nPrevious Q&A:\n${history}`,
            },
        ];

        const aiResponse = await askAi(messages);
        const nextQ      = aiResponse.split("\n").map(q => q.trim()).filter(q => q.length > 0)[0];

        if (!nextQ) {
            return res.status(500).json({ message: "AI failed to generate next question" });
        }

        interview.questions.push({
            question:   nextQ,
            difficulty: nextDifficulty,
            timeLimit:  timeLimits[nextDifficulty] || 90,
        });
        await interview.save();

        const newQuestion = interview.questions[interview.questions.length - 1];

        res.json({
            question:       newQuestion,
            questionNumber: qNum,
            totalQuestions: interview.totalQuestions,
            avgScore:       Number(avgScore.toFixed(1)),
            adaptedDifficulty: nextDifficulty,
            done:           qNum >= interview.totalQuestions,
        });
    } catch (error) {
        console.error("[generateNextQuestion]", error.message);
        res.status(500).json({ message: `Failed to generate next question: ${error.message}` });
    }
};

// ── POST /interview/submit-answer (with speech intelligence) ──────────────────
const submitAnswer = async (req, res) => {
    try {
        const { interviewId, questionIndex, answer, timeTaken, fillerCount, wpm, starScore } = req.body;

        const interview = await Interview.findById(interviewId);
        if (!interview) return res.status(404).json({ message: "Interview not found" });

        const question = interview.questions[questionIndex];

        if (!answer) {
            question.score    = 0;
            question.feedback = "You did not submit an answer.";
            question.answer   = "";
            await interview.save();
            return res.json({ feedback: question.feedback });
        }

        if (timeTaken > question.timeLimit) {
            question.score    = 0;
            question.feedback = "Time limit exceeded. Answer not evaluated.";
            question.answer   = answer;
            await interview.save();
            return res.json({ feedback: question.feedback });
        }

        // Build speech intelligence context for AI
        const speechContext = [];
        if (typeof fillerCount === "number") speechContext.push(`Filler words used: ${fillerCount}`);
        if (typeof wpm === "number" && wpm > 0) speechContext.push(`Speaking pace: ${wpm} WPM (ideal: 120-150)`);
        if (typeof starScore === "number" && interview.mode === "HR") speechContext.push(`STAR method adherence: ${starScore}/4 components used`);
        const speechPrompt = speechContext.length
            ? `\n\nSpeech metrics to factor into confidence/communication scores:\n${speechContext.join("\n")}`
            : "";

        const messages = [
            {
                role:    "system",
                content: `You are a professional human interviewer evaluating a candidate's answer.
Score 0-10 for:
1. Confidence – clear, confident presentation
2. Communication – simple, clear language
3. Correctness – accurate, relevant, complete

finalScore = average of the three (round to nearest whole number).
Feedback: 10-15 words, professional, honest, natural.${speechPrompt}

Return ONLY valid JSON:
{
  "confidence": number,
  "communication": number,
  "correctness": number,
  "finalScore": number,
  "feedback": "short feedback"
}`,
            },
            {
                role:    "user",
                content: `Question: ${question.question}\nAnswer: ${answer}`,
            },
        ];

        const aiResponse = await askAi(messages);
        const parsed     = JSON.parse(aiResponse);

        question.answer        = answer;
        question.confidence    = parsed.confidence;
        question.communication = parsed.communication;
        question.correctness   = parsed.correctness;
        question.score         = parsed.finalScore;
        question.feedback      = parsed.feedback;
        // Store speech metrics
        question.fillerCount   = fillerCount || 0;
        question.wpm           = wpm         || 0;
        question.starScore     = starScore   || 0;
        await interview.save();

        // Generate a smart follow-up question based on the answer
        let followUp = null;
        try {
            const followUpMessages = [
                {
                    role:    "system",
                    content: `You are a professional interviewer. Based on the candidate's answer, generate ONE smart follow-up question that digs deeper.
Rules:
- Must be 10-20 words max
- Must be directly related to what they said
- If answer was weak/vague, ask for clarification
- If answer was good, go deeper technically
- Return ONLY the question text, nothing else`,
                },
                {
                    role:    "user",
                    content: `Question: ${question.question}
Answer: ${answer}`,
                },
            ];
            followUp = await askAi(followUpMessages);
            followUp = followUp.trim();
        } catch (e) {
            console.warn("[submitAnswer] Follow-up generation failed:", e.message);
        }

        res.json({ feedback: parsed.feedback, followUp });
    } catch (error) {
        console.error("[submitAnswer]", error.message);
        res.status(500).json({ message: `Failed to submit answer: ${error.message}` });
    }
};

// ── POST /interview/finish ────────────────────────────────────────────────────
const finishInterview = async (req, res) => {
    try {
        const { interviewId } = req.body;
        const interview = await Interview.findById(interviewId);
        if (!interview) return res.status(404).json({ message: "Interview not found" });

        const total = interview.questions.length;
        let totalScore = 0, totalConf = 0, totalComm = 0, totalCorr = 0;

        interview.questions.forEach(q => {
            totalScore += q.score         || 0;
            totalConf  += q.confidence    || 0;
            totalComm  += q.communication || 0;
            totalCorr  += q.correctness   || 0;
        });

        interview.finalScore = total ? totalScore / total : 0;
        interview.status     = "completed";
        await interview.save();

        res.json({
            finalScore:       Number((interview.finalScore).toFixed(1)),
            confidence:       Number((totalConf  / total).toFixed(1)),
            communication:    Number((totalComm  / total).toFixed(1)),
            correctness:      Number((totalCorr  / total).toFixed(1)),
            questionWiseScore: interview.questions.map(q => ({
                question:      q.question,
                score:         q.score         || 0,
                feedback:      q.feedback      || "",
                confidence:    q.confidence    || 0,
                communication: q.communication || 0,
                correctness:   q.correctness   || 0,
            })),
        });
    } catch (error) {
        console.error("[finishInterview]", error.message);
        res.status(500).json({ message: `Failed to finish interview: ${error.message}` });
    }
};

// ── GET /interview/get-interview ──────────────────────────────────────────────
const getMyInterviews = async (req, res) => {
    try {
        const interviews = await Interview.find({ userId: req.result._id })
            .sort({ createdAt: -1 })
            .select("role experience mode finalScore status createdAt");
        res.json(interviews);
    } catch (error) {
        console.error("[getMyInterviews]", error.message);
        res.status(500).json({ message: `Failed to get interviews: ${error.message}` });
    }
};

// ── GET /interview/report/:id ─────────────────────────────────────────────────
const getInterviewReport = async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);
        if (!interview) return res.status(404).json({ message: "Interview not found" });

        const total = interview.questions.length;
        let totalConf = 0, totalComm = 0, totalCorr = 0;

        interview.questions.forEach(q => {
            totalConf += q.confidence    || 0;
            totalComm += q.communication || 0;
            totalCorr += q.correctness   || 0;
        });

        res.json({
            finalScore:        interview.finalScore,
            confidence:        Number((totalConf / total).toFixed(1)),
            communication:     Number((totalComm / total).toFixed(1)),
            correctness:       Number((totalCorr / total).toFixed(1)),
            questionWiseScore: interview.questions,
        });
    } catch (error) {
        console.error("[getInterviewReport]", error.message);
        res.status(500).json({ message: `Failed to get report: ${error.message}` });
    }
};

// ── GET /interview/analytics ──────────────────────────────────────────────────
const getInterviewAnalytics = async (req, res) => {
    try {
        const userId = req.result._id;
        const interviews = await Interview.find({ userId, status: "completed" })
            .sort({ createdAt: 1 })
            .lean();

        if (!interviews.length) {
            return res.json({
                timeline: [], skillAvg: { confidence: 0, communication: 0, correctness: 0 },
                topicMap: {}, totalCount: 0, completedCount: 0, avgImprovement: 0,
            });
        }

        // Timeline data
        const timeline = interviews.map(iv => {
            const qs = iv.questions || [];
            const total = qs.length || 1;
            return {
                date:  iv.createdAt,
                score: Number((iv.finalScore || 0).toFixed(1)),
                role:  iv.role,
                mode:  iv.mode,
                confidence:    Number((qs.reduce((a, q) => a + (q.confidence || 0), 0) / total).toFixed(1)),
                communication: Number((qs.reduce((a, q) => a + (q.communication || 0), 0) / total).toFixed(1)),
                correctness:   Number((qs.reduce((a, q) => a + (q.correctness || 0), 0) / total).toFixed(1)),
                avgFillers:    Number((qs.reduce((a, q) => a + (q.fillerCount || 0), 0) / total).toFixed(1)),
                avgWpm:        Number((qs.reduce((a, q) => a + (q.wpm || 0), 0) / total).toFixed(0)),
            };
        });

        // Skill averages
        const totals = { confidence: 0, communication: 0, correctness: 0 };
        interviews.forEach(iv => {
            const qs = iv.questions || [];
            const total = qs.length || 1;
            totals.confidence    += qs.reduce((a, q) => a + (q.confidence || 0), 0) / total;
            totals.communication += qs.reduce((a, q) => a + (q.communication || 0), 0) / total;
            totals.correctness   += qs.reduce((a, q) => a + (q.correctness || 0), 0) / total;
        });
        const n = interviews.length;
        const skillAvg = {
            confidence:    Number((totals.confidence / n).toFixed(1)),
            communication: Number((totals.communication / n).toFixed(1)),
            correctness:   Number((totals.correctness / n).toFixed(1)),
        };

        // Topic heatmap
        const topicMap = {};
        interviews.forEach(iv => {
            const key = iv.role;
            if (!topicMap[key]) topicMap[key] = { count: 0, totalScore: 0 };
            topicMap[key].count      += 1;
            topicMap[key].totalScore += iv.finalScore || 0;
        });
        Object.keys(topicMap).forEach(key => {
            topicMap[key].avgScore = Number((topicMap[key].totalScore / topicMap[key].count).toFixed(1));
        });

        // Avg improvement (last 5 vs first 5)
        let avgImprovement = 0;
        if (n >= 4) {
            const half     = Math.floor(n / 2);
            const firstAvg = interviews.slice(0, half).reduce((a, iv) => a + (iv.finalScore || 0), 0) / half;
            const lastAvg  = interviews.slice(-half).reduce((a, iv) => a + (iv.finalScore || 0), 0) / half;
            avgImprovement = Number((lastAvg - firstAvg).toFixed(1));
        }

        // Total count including incomplete
        const totalCount = await Interview.countDocuments({ userId });

        res.json({
            timeline,
            skillAvg,
            topicMap,
            totalCount,
            completedCount: n,
            avgImprovement,
        });
    } catch (error) {
        console.error("[getInterviewAnalytics]", error.message);
        res.status(500).json({ message: `Failed to get analytics: ${error.message}` });
    }
};

module.exports = {
    upload,
    analyzeResume,
    generateQuestion,
    generateNextQuestion,
    submitAnswer,
    finishInterview,
    getMyInterviews,
    getInterviewReport,
    getInterviewAnalytics,
};