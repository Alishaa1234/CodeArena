const express = require('express');
const submitRouter = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { submitCode, runCode } = require("../controllers/userSubmission");

submitRouter.post("/submit/:id", authMiddleware(), submitCode);
submitRouter.post("/run/:id", authMiddleware(), runCode);

module.exports = submitRouter;
