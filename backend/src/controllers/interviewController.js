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

// ── POST /interview/generate-questions ────────────────────────────────────────
const generateQuestion = async (req, res) => {
    try {
        let { role, experience, mode, resumeText, projects, skills } = req.body;

        role       = role?.trim();
        experience = experience?.trim();
        mode       = mode?.trim();

        if (!role || !experience || !mode) {
            return res.status(400).json({ message: "Role, experience and mode are required" });
        }

        // Use the LeetCode user from authMiddleware (req.result)
        const user = req.result;

        const projectText = Array.isArray(projects) && projects.length ? projects.join(", ") : "None";
        const skillsText  = Array.isArray(skills)   && skills.length   ? skills.join(", ")   : "None";
        const safeResume  = resumeText?.trim() || "None";

        const messages = [
            {
                role:    "system",
                content: `You are a real human interviewer conducting a professional interview.
Generate exactly 5 interview questions.
Rules:
- Each question must be 15-25 words.
- Each question must be a single complete sentence.
- Do NOT number them.
- Do NOT add explanations or extra text.
- One question per line only.
Difficulty: Q1=easy, Q2=easy, Q3=medium, Q4=medium, Q5=hard.
Make questions based on role, experience, mode, projects, skills and resume.`,
            },
            {
                role:    "user",
                content: `Role:${role}\nExperience:${experience}\nMode:${mode}\nProjects:${projectText}\nSkills:${skillsText}\nResume:${safeResume}`,
            },
        ];

        const aiResponse    = await askAi(messages);
        const questionsArray = aiResponse
            .split("\n")
            .map(q => q.trim())
            .filter(q => q.length > 0)
            .slice(0, 5);

        if (questionsArray.length === 0) {
            return res.status(500).json({ message: "AI failed to generate questions" });
        }

        const interview = await Interview.create({
            userId:     user._id,
            role,
            experience,
            mode,
            resumeText: safeResume,
            questions:  questionsArray.map((q, index) => ({
                question:  q,
                difficulty: ["easy","easy","medium","medium","hard"][index],
                timeLimit:  [60,60,90,90,120][index],
            })),
        });

        res.json({
            interviewId: interview._id,
            userName:    user.firstName,
            questions:   interview.questions,
        });
    } catch (error) {
        console.error("[generateQuestion]", error.message);
        res.status(500).json({ message: `Failed to create interview: ${error.message}` });
    }
};

// ── POST /interview/submit-answer ─────────────────────────────────────────────
const submitAnswer = async (req, res) => {
    try {
        const { interviewId, questionIndex, answer, timeTaken } = req.body;

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

        const messages = [
            {
                role:    "system",
                content: `You are a professional human interviewer evaluating a candidate's answer.
Score 0-10 for:
1. Confidence – clear, confident presentation
2. Communication – simple, clear language
3. Correctness – accurate, relevant, complete

finalScore = average of the three (round to nearest whole number).
Feedback: 10-15 words, professional, honest, natural.

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

module.exports = {
    upload,
    analyzeResume,
    generateQuestion,
    submitAnswer,
    finishInterview,
    getMyInterviews,
    getInterviewReport,
};