const axios = require('axios');

const LANGUAGE_MAP = {
    "c++": 54,
    "java": 62,
    "javascript": 63,
};

const judge0 = axios.create({
    baseURL: 'https://ce.judge0.com',
    timeout: 30000, // 30 seconds
    headers: { 'Content-Type': 'application/json' },
});

const getLanguageById = (lang) => {
    const id = LANGUAGE_MAP[lang.toLowerCase()];
    if (!id) throw new Error(`Unsupported language: ${lang}`);
    return id;
};

const submitBatch = async (submissions) => {
    const response = await judge0.post(
        '/submissions/batch',
        { submissions },
        { params: { base64_encoded: 'false' } }
    );
    return response.data;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const submitToken = async (resultToken) => {
    let attempts = 0;
    const maxAttempts = 20; // wait up to 20 seconds total

    while (attempts < maxAttempts) {
        const response = await judge0.get('/submissions/batch', {
            params: {
                tokens: resultToken.join(","),
                base64_encoded: 'false',
                fields: '*',
            },
        });

        const { submissions } = response.data;
        const allDone = submissions.every((r) => r.status_id > 2);

        if (allDone) return submissions;

        await sleep(1000);
        attempts++;
    }

    throw new Error('Judge0 timed out waiting for results');
};

module.exports = { getLanguageById, submitBatch, submitToken };