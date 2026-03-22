const express = require('express');
const router  = express.Router();
const authMiddleware       = require('../middleware/authMiddleware');
const { reviewCode }       = require('../controllers/agentController');

// POST /agent/review/:problemId
// Body: { code, language }
router.post('/review/:problemId', authMiddleware(), reviewCode);

module.exports = router;