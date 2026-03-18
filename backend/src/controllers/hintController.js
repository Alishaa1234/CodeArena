const axios = require('axios');
const Problem = require('../models/problem');
const { redisClient } = require('../config/redis');

const HINT_TTL = 60 * 60 * 24; // 24 hours

const HINT_PROMPTS = {
    1: `Give a very vague hint. Do NOT mention any data structure or algorithm by name.
Just nudge the user's thinking in 1-2 sentences.
Example style: "Think about what information you need to remember as you iterate."
Reply with ONLY the hint text — no preamble like "Here's your hint:".`,

    2: `Give a medium hint. You can mention a data structure or general technique
but do NOT describe the actual algorithm steps. Keep it to 2-3 sentences.
Example style: "A hash map could help you avoid nested loops here."
Reply with ONLY the hint text — no preamble.`,

    3: `Give a specific hint. Describe the approach clearly step by step
but do NOT write any code. Keep it to 3-5 sentences.
Reply with ONLY the hint text — no preamble.`,
};

const callOpenRouter = async (systemText, userText) => {
    const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            model: 'openai/gpt-4o-mini',
            messages: [
                { role: 'system', content: systemText },
                { role: 'user',   content: userText   },
            ],
        },
        {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
                'Content-Type':  'application/json',
                'HTTP-Referer':  'http://localhost:5173',
                'X-Title':       'DSA Practice Platform',
            },
        }
    );
    const content = response.data.choices?.[0]?.message?.content;
    if (!content || !content.trim()) throw new Error('Empty response from AI');
    return content.trim();
};

const generateHints = async (problem) => {
    const systemText = `You are a DSA tutor giving progressive hints for coding problems.
Never give away the full solution. Be concise.
Reply with ONLY the hint text — no intro phrases.`;

    const hints = {};
    for (const level of [1, 2, 3]) {
        const userText = `Problem: ${problem.title}

Description: ${problem.description}

Examples: ${JSON.stringify(problem.visibleTestCases?.slice(0, 2))}

${HINT_PROMPTS[level]}`;

        hints[level] = await callOpenRouter(systemText, userText);
    }
    return hints;
};

// POST /hint/:problemId
// Body: { hintNumber: 1 | 2 | 3 }

const getHint = async (req, res) => {
    try {
        const { problemId } = req.params;
        const hintNumber    = parseInt(req.body.hintNumber, 10);

        if (![1, 2, 3].includes(hintNumber)) {
            return res.status(400).json({ message: 'hintNumber must be 1, 2, or 3' });
        }

        // Check Redis cache — same problem never calls the API twice
        const cacheKey = `hints:${problemId}`;
        let hints = null;

        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) hints = JSON.parse(cached);
        } catch (_) { /* Redis down — skip cache */ }

        if (!hints) {
            const problem = await Problem.findById(problemId)
                .select('title description visibleTestCases');

            if (!problem) return res.status(404).json({ message: 'Problem not found' });

            hints = await generateHints(problem);

            try {
                await redisClient.setEx(cacheKey, HINT_TTL, JSON.stringify(hints));
            } catch (_) { /* Cache write failed — still return hint */ }
        }

        res.json({ hint: hints[hintNumber], hintNumber });

    } catch (err) {
        console.error('[getHint]', err.response?.data || err.message);
        if (err.response?.status === 429) {
            return res.status(429).json({ message: 'AI is busy right now — please wait a few seconds and try again.' });
        }
        res.status(500).json({ message: 'Failed to generate hint' });
    }
};

module.exports = { getHint };