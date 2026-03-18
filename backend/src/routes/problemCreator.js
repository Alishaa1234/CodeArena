const express = require('express');
const problemRouter = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
    createProblem, updateProblem, deleteProblem,
    getProblemById, getAllProblem, solvedAllProblembyUser, submittedProblem,
} = require("../controllers/userProblem");

problemRouter.post("/create", authMiddleware('admin'), createProblem);
problemRouter.put("/update/:id", authMiddleware('admin'), updateProblem);
problemRouter.delete("/delete/:id", authMiddleware('admin'), deleteProblem);

problemRouter.get("/problemById/:id", authMiddleware(), getProblemById);
problemRouter.get("/getAllProblem", authMiddleware(), getAllProblem);
problemRouter.get("/problemSolvedByUser", authMiddleware(), solvedAllProblembyUser);
problemRouter.get("/submittedProblem/:pid", authMiddleware(), submittedProblem);

module.exports = problemRouter;
