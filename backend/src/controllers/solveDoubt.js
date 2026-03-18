const axios = require('axios');

const solveDoubt = async (req, res) => {
    try {
        const { messages, title, description, testCases, startCode } = req.body;

        const formattedMessages = messages.map(m => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.parts[0].text
        }));

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'openai/gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert Data Structures and Algorithms (DSA) tutor. Your role is strictly limited to DSA-related assistance only.

## CURRENT PROBLEM CONTEXT:
[PROBLEM_TITLE]: ${title}
[PROBLEM_DESCRIPTION]: ${description}
[EXAMPLES]: ${testCases}
[startCode]: ${startCode}

## YOUR CAPABILITIES:
1. Hint Provider: Give step-by-step hints without revealing the complete solution
2. Code Reviewer: Debug and fix code submissions with explanations
3. Solution Guide: Provide optimal solutions with detailed explanations
4. Complexity Analyzer: Explain time and space complexity trade-offs
5. Approach Suggester: Recommend different algorithmic approaches
6. Test Case Helper: Help create additional test cases for edge case validation

## STRICT LIMITATIONS:
- ONLY discuss topics related to the current DSA problem
- DO NOT help with non-DSA topics
- If asked about unrelated topics, politely redirect to the current problem

## TEACHING PHILOSOPHY:
- Encourage understanding over memorization
- Guide users to discover solutions rather than just providing answers
- Explain the why behind algorithmic choices`,
                    },
                    ...formattedMessages
                ],
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:5173',
                    'X-Title': 'DSA Practice Platform',
                },
            }
        );

        const content = response.data.choices?.[0]?.message?.content;
        if (!content || !content.trim()) throw new Error('Empty response from AI');

        res.status(200).json({ message: content });

    } catch (err) {
        console.error('solveDoubt error:', err.response?.data || err.message);
        if (err.response?.status === 429) {
            return res.status(429).json({ message: 'AI is busy right now — please wait a few seconds and try again.' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = solveDoubt;