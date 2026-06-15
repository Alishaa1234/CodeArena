const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { upload, analyzeATS, rewriteBullet, extractJD } = require("../controllers/atsController");

// POST /ats/analyze     — upload resume PDF + JD text → full ATS report
// POST /ats/rewrite     — rewrite a weak bullet point
// POST /ats/extract-jd  — extract JD text from a URL

router.post("/analyze",    authMiddleware(), upload.single("resume"), analyzeATS);
router.post("/rewrite",    authMiddleware(), rewriteBullet);
router.post("/extract-jd", authMiddleware(), extractJD);

module.exports = router;