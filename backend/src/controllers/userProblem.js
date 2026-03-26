const { getLanguageById, submitBatch, submitToken } = require("../utils/problemUtility");
const Problem = require("../models/problem");
const User = require("../models/user");
const Submission = require("../models/submission");
const SolutionVideo = require("../models/solutionVideo");

// Shared helper: validates all reference solutions against visible test cases via Judge0
const validateReferenceSolutions = async (referenceSolution, visibleTestCases) => {
    for (const { language, completeCode } of referenceSolution) {
        const languageId = getLanguageById(language);

        const submissions = visibleTestCases.map((testcase) => ({
            source_code: completeCode,
            language_id: languageId,
            stdin: testcase.input,
            expected_output: testcase.output,
        }));

        const submitResult = await submitBatch(submissions);
        const resultToken = submitResult.map((v) => v.token);
        const testResult = await submitToken(resultToken);

        for (const test of testResult) {
            if (test.status_id !== 3) {
                throw new Error(`Reference solution for ${language} failed test case`);
            }
        }
    }
};

const createProblem = async (req, res, next) => {
    try {
        const { referenceSolution, visibleTestCases } = req.body;
        await validateReferenceSolutions(referenceSolution, visibleTestCases);

        const userProblem = await Problem.create({
            ...req.body,
            problemCreator: req.result._id,
        });

        res.status(201).json({ message: "Problem saved successfully", id: userProblem._id });
    } catch (err) {
        next(err);
    }
};

const updateProblem = async (req, res, next) => {
    const { id } = req.params;

    try {
        const existing = await Problem.findById(id);
        if (!existing)
            return res.status(404).json({ message: "Problem not found" });

        const { referenceSolution, visibleTestCases } = req.body;
        await validateReferenceSolutions(referenceSolution, visibleTestCases);

        const updated = await Problem.findByIdAndUpdate(id, req.body, {
            runValidators: true,
            new: true,
        });

        res.status(200).json(updated);
    } catch (err) {
        next(err);
    }
};

const deleteProblem = async (req, res, next) => {
    const { id } = req.params;
    try {
        const deleted = await Problem.findByIdAndDelete(id);
        if (!deleted)
            return res.status(404).json({ message: "Problem not found" });

        res.status(200).json({ message: "Deleted successfully" });
    } catch (err) {
        next(err);
    }
};

const getProblemById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const problem = await Problem.findById(id).select(
            '_id title description difficulty tags visibleTestCases startCode referenceSolution paramNames constraints points'
        );
        if (!problem)
            return res.status(404).json({ message: "Problem not found" });

        const video = await SolutionVideo.findOne({ problemId: id });
        if (video) {
            return res.status(200).json({
                ...problem.toObject(),
                secureUrl: video.secureUrl,
                thumbnailUrl: video.thumbnailUrl,
                duration: video.duration,
            });
        }

        res.status(200).json(problem);
    } catch (err) {
        next(err);
    }
};

const getAllProblem = async (req, res, next) => {
    try {
        const problems = await Problem.find({}).select('_id title difficulty tags');
        res.status(200).json(problems);
    } catch (err) {
        next(err);
    }
};

const solvedAllProblembyUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.result._id).populate({
            path: "problemSolved",
            select: "_id title difficulty tags",
        });
        res.status(200).json(user.problemSolved);
    } catch (err) {
        next(err);
    }
};

const submittedProblem = async (req, res, next) => {
    try {
        const userId = req.result._id;
        const problemId = req.params.pid;

        const submissions = await Submission.find({ userId, problemId });

        res.status(200).json(submissions);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createProblem, updateProblem, deleteProblem,
    getProblemById, getAllProblem, solvedAllProblembyUser, submittedProblem,
};