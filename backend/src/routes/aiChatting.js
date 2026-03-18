const express = require('express');
const aiRouter = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const solveDoubt = require('../controllers/solveDoubt');

aiRouter.post('/chat', authMiddleware(), solveDoubt);

module.exports = aiRouter;
