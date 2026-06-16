const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { upload, analyzeATS, getJobStatus, rewriteBullet, extractJD, getHistory, getAnalysis, deleteAnalysis } = require("../controllers/atsController");

// POST /ats/analyze      — upload resume PDF + JD text → enqueue background job
// GET  /ats/job/:jobId   — poll job status (queued/processing/completed/failed)
// POST /ats/rewrite      — rewrite a weak bullet point
// POST /ats/extract-jd   — extract JD text from a URL
// GET  /ats/history      — user's past analyses
// GET  /ats/analysis/:id — single analysis detail
// DELETE /ats/analysis/:id — delete analysis

router.post("/analyze",        authMiddleware(), upload.single("resume"), analyzeATS);
router.get("/job/:jobId",      authMiddleware(), getJobStatus);
router.post("/rewrite",        authMiddleware(), rewriteBullet);
router.post("/extract-jd",     authMiddleware(), extractJD);
router.get("/history",         authMiddleware(), getHistory);
router.get("/analysis/:id",    authMiddleware(), getAnalysis);
router.delete("/analysis/:id", authMiddleware(), deleteAnalysis);

module.exports = router;