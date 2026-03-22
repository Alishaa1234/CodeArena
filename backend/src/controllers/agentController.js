const Problem = require('../models/problem');
const { runCodeReviewAgent } = require('../agents/codeReviewAgent');

const normalizeLanguage = (lang) => lang === 'cpp' ? 'c++' : lang;

/**
 * POST /agent/review/:problemId
 * Body: { code, language, accepted }
 */
const reviewCode = async (req, res, next) => {
    try {
        let { code, language, accepted } = req.body;

        if (!code || !language) {
            return res.status(400).json({ message: 'code and language are required' });
        }

        language = normalizeLanguage(language);

        const problem = await Problem.findById(req.params.problemId)
            .select('title description visibleTestCases');

        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }

        const result = await runCodeReviewAgent({
            code,
            language,
            problem,
            accepted: !!accepted,
        });

        res.json(result);

    } catch (err) {
        console.error('[agentController]', err.message);
        next(err);
    }
};

module.exports = { reviewCode };