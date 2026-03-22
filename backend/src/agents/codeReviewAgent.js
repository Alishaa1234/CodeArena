const axios = require('axios');
const { getLanguageById, submitBatch, submitToken } = require('../utils/problemUtility');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_ITERATIONS = 4; // agent loop limit — prevents infinite loops

// ── Tool: run code via Judge0 ─────────────────────────────────────────────────

const runCode = async (code, language, testCases) => {
    const languageId  = getLanguageById(language);
    const submissions = testCases.map((tc) => ({
        source_code:     code,
        language_id:     languageId,
        stdin:           tc.input,
        expected_output: tc.output,
    }));

    const tokens  = await submitBatch(submissions);
    const results = await submitToken(tokens.map((t) => t.token));

    return results.map((r, i) => ({
        testCase:      i + 1,
        input:         testCases[i].input,
        expected:      testCases[i].output,
        actual:        r.stdout?.trim() || r.stderr?.trim() || '(no output)',
        passed:        r.status_id === 3,
        statusId:      r.status_id,
        statusName:    r.status?.description || 'Unknown',
        stderr:        r.stderr || null,
        compileOutput: r.compile_output || null,
        time:          r.time,
        memory:        r.memory,
    }));
};

// ── Format test results for the AI prompt ─────────────────────────────────────

const formatResults = (results) => {
    return results.map((r) => {
        const lines = [
            `Test ${r.testCase}: ${r.passed ? 'PASSED' : 'FAILED'}`,
            `  Input:    ${r.input}`,
            `  Expected: ${r.expected}`,
            `  Actual:   ${r.actual}`,
        ];
        if (r.stderr)        lines.push(`  Error:    ${r.stderr}`);
        if (r.compileOutput) lines.push(`  Compile:  ${r.compileOutput}`);
        return lines.join('\n');
    }).join('\n\n');
};

// ── Call OpenRouter ───────────────────────────────────────────────────────────

const callLLM = async (messages) => {
    const response = await axios.post(
        OPENROUTER_URL,
        {
            model: 'openai/gpt-4o-mini',
            messages,
            temperature: 0.3,
        },
        {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
                'Content-Type':  'application/json',
                'HTTP-Referer':  'http://localhost:5173',
                'X-Title':       'DSA Code Review Agent',
            },
        }
    );
    return response.data.choices?.[0]?.message?.content || '';
};

// ── Parse action from agent response ─────────────────────────────────────────
// Agent signals it wants to run code by wrapping it in <RUN_CODE>...</RUN_CODE>

const parseAction = (text) => {
    const match = text.match(/<RUN_CODE>([\s\S]*?)<\/RUN_CODE>/);
    if (match) return { type: 'run_code', code: match[1].trim() };
    return { type: 'finish', text };
};

// ── Main agent function ───────────────────────────────────────────────────────

/**
 * Run the code review agent.
 *
 * @param {object} opts
 * @param {string} opts.code         — user's submitted code
 * @param {string} opts.language     — 'javascript' | 'java' | 'cpp'
 * @param {object} opts.problem      — { title, description, visibleTestCases }
 * @param {boolean} opts.accepted    — whether the submission was accepted
 * @returns {Promise<object>}        — { review, fixedCode, iterations, testResults }
 */
const runCodeReviewAgent = async ({ code, language, problem, accepted }) => {
    const testCases = problem.visibleTestCases || [];

    // ── Step 1: Run the user's original code ─────────────────────────────────
    let initialResults;
    try {
        initialResults = await runCode(code, language, testCases);
    } catch (err) {
        initialResults = [];
    }

    const passedCount = initialResults.filter(r => r.passed).length;
    const totalCount  = initialResults.length;

    // ── Step 2: Build initial agent prompt ────────────────────────────────────
    const systemPrompt = `You are an expert DSA code reviewer acting as an AI agent.

You have ONE tool available:
- RUN_CODE: Execute code against the problem's test cases. Wrap the code in <RUN_CODE>...</RUN_CODE> tags.

Your job:
1. Analyze the user's code and the test results
2. If the code has issues, optionally run a corrected version to verify it works
3. Produce a final structured review

Your final review MUST follow this exact format (use these exact headers):

## ⏱ Complexity
[Time complexity and space complexity with explanation]

## ✅ What you did well
[2-3 specific things done correctly]

## 🔧 What to improve
[Specific issues found, referencing actual test failures if any]

## 💡 Cleaner approach
[A better algorithm or implementation if one exists, with brief code snippet]

RULES:
- Only use RUN_CODE when you want to verify a fix — do not run the original code again
- After at most 2 tool uses, produce your final review
- Never reveal hidden test cases
- Be specific and encouraging
- If the code was accepted (all tests passed), still review for complexity and style`;

    const userMessage = `Problem: ${problem.title}

Description: ${problem.description}

User's ${language} code:
\`\`\`${language}
${code}
\`\`\`

Submission status: ${accepted ? 'ACCEPTED ✓' : 'FAILED ✗'}
Visible test results (${passedCount}/${totalCount} passed):

${initialResults.length > 0 ? formatResults(initialResults) : 'Could not run test cases.'}

Please review this code and provide structured feedback. If you want to verify a fix, use <RUN_CODE>...</RUN_CODE>. Then give your final review.`;

    // ── Step 3: Agent loop ────────────────────────────────────────────────────
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
    ];

    let fixedCode    = null;
    let finalReview  = null;
    let iterations   = 0;
    let lastResults  = initialResults;

    while (iterations < MAX_ITERATIONS) {
        iterations++;

        const agentResponse = await callLLM(messages);
        messages.push({ role: 'assistant', content: agentResponse });

        const action = parseAction(agentResponse);

        if (action.type === 'run_code') {
            // Agent wants to run a fixed version
            fixedCode = action.code;
            let runResults;
            try {
                runResults  = await runCode(fixedCode, language, testCases);
                lastResults = runResults;
            } catch (err) {
                runResults = [];
            }

            const fixPassed = runResults.filter(r => r.passed).length;

            // Feed results back to agent
            messages.push({
                role:    'user',
                content: `Code execution results (${fixPassed}/${totalCount} passed):\n\n${formatResults(runResults)}\n\nNow provide your final structured review.`,
            });

        } else {
            // Agent produced final review — extract it
            finalReview = agentResponse
                .replace(/<RUN_CODE>[\s\S]*?<\/RUN_CODE>/g, '')
                .trim();
            break;
        }
    }

    // Fallback if agent never finished
    if (!finalReview) {
        const fallback = await callLLM([
            ...messages,
            { role: 'user', content: 'Please now give your final structured review.' },
        ]);
        finalReview = fallback;
    }

    return {
        review:      finalReview,
        fixedCode,
        iterations,
        testResults: lastResults,
        passedCount,
        totalCount,
    };
};

module.exports = { runCodeReviewAgent };