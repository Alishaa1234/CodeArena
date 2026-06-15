const express   = require("express");
const router    = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
    upload,
    analyzeResume,
    generateQuestion,
    submitAnswer,
    finishInterview,
    getMyInterviews,
    getInterviewReport,
} = require("../controllers/interviewController");

// POST /interview/resume           — upload + analyze resume
// POST /interview/generate-questions — generate 5 questions
// POST /interview/submit-answer    — evaluate one answer
// POST /interview/finish           — finish and score the interview
// GET  /interview/get-interview    — get all interviews for current user
// GET  /interview/report/:id       — get full report for one interview

router.post("/resume",             authMiddleware(), upload.single("resume"), analyzeResume);
router.post("/generate-questions", authMiddleware(), generateQuestion);
router.post("/submit-answer",      authMiddleware(), submitAnswer);
router.post("/finish",             authMiddleware(), finishInterview);
router.get("/get-interview",       authMiddleware(), getMyInterviews);
router.get("/report/:id",          authMiddleware(), getInterviewReport);

module.exports = router;