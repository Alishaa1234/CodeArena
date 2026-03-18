const express = require('express');
const profileRouter = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getProfile } = require('../controllers/userProfile');

profileRouter.get('/me', authMiddleware(), getProfile);

module.exports = profileRouter;