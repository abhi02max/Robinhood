function extractAssignments(code) {
    const lines = String(code || '').split(/\r?\n/);
    const assignments = [];

    for (let index = 0; index < lines.length; index += 1) {
        const rawLine = lines[index];
        const line = rawLine.trim();
        if (!line || line.startsWith('//') || line.startsWith('#')) continue;

        const match = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^=].*)$/.exec(line);
        if (!match) continue;

        assignments.push({
            variable: match[1],
            valueExpression: match[2].slice(0, 120),
            lineNumber: index + 1,
        });
    }

    return assignments;
}

function parseOutputLines(output) {
    return String(output || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 20);
}

export function analyzeRuntime(payload = {}) {
    const executionResult = payload.executionResult || payload || {};
    const code = payload.code || executionResult.code || '';
    const output = executionResult.output || executionResult.stdout || '';
    const stderr = executionResult.stderr || '';

    const assignmentEvents = extractAssignments(code);
    const outputLines = parseOutputLines(output);
    const errorLines = parseOutputLines(stderr);

    const states = assignmentEvents.slice(0, 25).map((event, index) => ({
        step: index + 1,
        lineNumber: event.lineNumber,
        variables: {
            [event.variable]: event.valueExpression,
        },
        explanation: `Assignment observed for ${event.variable}`,
    }));

    const watch = assignmentEvents.slice(0, 8).map((event) => ({
        variable: event.variable,
        lineNumber: event.lineNumber,
        latestExpression: event.valueExpression,
    }));

    return {
        states,
        watch,
        outputLines,
        errorLines,
        final: outputLines[outputLines.length - 1] || null,
        hadRuntimeError: errorLines.length > 0,
    };
}