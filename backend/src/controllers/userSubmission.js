const Problem = require("../models/problem");
const Submission = require("../models/submission");
const { getLanguageById, submitBatch, submitToken } = require("../utils/problemUtility");

const normalizeLanguage = (lang) => lang === 'cpp' ? 'c++' : lang;

const submitCode = async (req, res, next) => {
    try {
        const userId = req.result._id;
        const problemId = req.params.id;
        let { code, language } = req.body;

        if (!code || !language)
            return res.status(400).json({ message: "Missing required fields" });

        language = normalizeLanguage(language);

        const problem = await Problem.findById(problemId);
        if (!problem)
            return res.status(404).json({ message: "Problem not found" });

        const submittedResult = await Submission.create({
            userId,
            problemId,
            code,
            language,
            status: 'pending',
            testCasesTotal: problem.hiddenTestCases.length,
        });

        const languageId = getLanguageById(language);
        const submissions = problem.hiddenTestCases.map((tc) => ({
            source_code: code,
            language_id: languageId,
            stdin: tc.input,
            expected_output: tc.output,
        }));

        const submitResult = await submitBatch(submissions);
        const resultToken = submitResult.map((v) => v.token);
        const testResult = await submitToken(resultToken);

        let testCasesPassed = 0;
        let runtime = 0;
        let memory = 0;
        let status = 'accepted';
        let errorMessage = null;

        for (const test of testResult) {
            if (test.status_id === 3) {
                testCasesPassed++;
                runtime += parseFloat(test.time);
                memory = Math.max(memory, test.memory);
            } else {
                status = test.status_id === 4 ? 'error' : 'wrong';
                errorMessage = test.stderr;
            }
        }

        submittedResult.status = status;
        submittedResult.testCasesPassed = testCasesPassed;
        submittedResult.errorMessage = errorMessage;
        submittedResult.runtime = runtime;
        submittedResult.memory = memory;
        await submittedResult.save();

        if (status === 'accepted' && !req.result.problemSolved.includes(problemId)) {
            req.result.problemSolved.push(problemId);
            await req.result.save();
        }

        res.status(201).json({
            accepted: status === 'accepted',
            totalTestCases: submittedResult.testCasesTotal,
            passedTestCases: testCasesPassed,
            runtime,
            memory,
        });
    } catch (err) {
        next(err);
    }
};

const runCode = async (req, res, next) => {
    try {
        const problemId = req.params.id;
        let { code, language } = req.body;

        if (!code || !language)
            return res.status(400).json({ message: "Missing required fields" });

        language = normalizeLanguage(language);

        const problem = await Problem.findById(problemId);
        if (!problem)
            return res.status(404).json({ message: "Problem not found" });

        const languageId = getLanguageById(language);
        const submissions = problem.visibleTestCases.map((tc) => ({
            source_code: code,
            language_id: languageId,
            stdin: tc.input,
            expected_output: tc.output,
        }));

        const submitResult = await submitBatch(submissions);
        const resultToken = submitResult.map((v) => v.token);
        const testResult = await submitToken(resultToken);

        let testCasesPassed = 0;
        let runtime = 0;
        let memory = 0;
        let success = true;
        let errorMessage = null;

        for (const test of testResult) {
            if (test.status_id === 3) {
                testCasesPassed++;
                runtime += parseFloat(test.time);
                memory = Math.max(memory, test.memory);
            } else {
                success = false;
                errorMessage = test.stderr;
            }
        }

        res.status(200).json({ success, testCases: testResult, runtime, memory });
    } catch (err) {
        next(err);
    }
};

module.exports = { submitCode, runCode };
