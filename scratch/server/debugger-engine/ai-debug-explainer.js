import { orchestrateAIRequest } from '../ai-gateway.js';

function fallbackExplanation(trace, code) {
    const summary = trace?.summary || 'Runtime error detected.';
    const frame = Array.isArray(trace?.frames) && trace.frames.length
        ? trace.frames[0]
        : null;

    const locationHint = frame
        ? `${frame.file || 'unknown file'}:${frame.line || '?'}${frame.column ? `:${frame.column}` : ''}`
        : 'unknown location';

    const suggestion = code && String(code).includes('==')
        ? 'Review branch conditions and ensure you are not using assignment where comparison is expected.'
        : 'Review the first failing frame, validate input assumptions, and check variable initialization order.';

    return {
        explanation: `${summary} Likely failing location: ${locationHint}. ${suggestion}`,
        likelyRootCause: summary,
        suggestedFixes: [
            'Reproduce with the smallest failing input.',
            'Print key variable states before the failing line.',
            'Guard against null/undefined/empty edge cases before deep operations.',
        ],
        provider: 'rule-based-fallback',
        model: null,
        cached: false,
    };
}

export async function explainError(trace, code, context = {}) {
    const systemPrompt = [
        'You are a senior debugging mentor.',
        'Explain runtime errors with concrete root-cause reasoning.',
        'Respond in concise markdown with sections: Root Cause, Fix Strategy, Verification Checklist.',
    ].join(' ');

    const userPrompt = [
        `Error Summary: ${trace?.summary || 'Unknown runtime error'}`,
        `Frames: ${JSON.stringify(trace?.frames || [])}`,
        'Code snippet:',
        String(code || '').slice(0, 5000),
    ].join('\n');

    try {
        const result = await orchestrateAIRequest(context?.redisClient || null, {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            userId: context?.userId || 'debugger-engine',
            problemId: 'runtime-debug',
            actionType: 'debug-explain',
            codeSnippet: String(code || '').slice(0, 2000),
            options: {
                temperature: 0.15,
                maxTokens: 600,
            },
        });

        if (!result?.success || !result?.content) {
            return fallbackExplanation(trace, code);
        }

        return {
            explanation: result.content,
            likelyRootCause: trace?.summary || 'Runtime error',
            suggestedFixes: [
                'Apply one minimal fix and re-run the same failing input.',
                'Add a regression test that captures the failing case.',
                'Verify complexity and side effects after the fix.',
            ],
            provider: result.provider,
            model: result.model,
            cached: Boolean(result.fromCache),
        };
    } catch (_) {
        return fallbackExplanation(trace, code);
    }
}