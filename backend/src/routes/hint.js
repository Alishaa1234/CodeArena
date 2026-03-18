const express = require('express');
const router  = express.Router();
const authMiddleware  = require('../middleware/authMiddleware');
const { getHint } = require('../controllers/hintController');

// POST /hint/:problemId
// Body: { hintNumber: 1 | 2 | 3 }
router.post('/:problemId', authMiddleware(), getHint);

module.exports = router;