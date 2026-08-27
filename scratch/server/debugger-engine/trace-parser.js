const MAX_STACK_BYTES = Math.max(1_024, Number(process.env.DEBUG_TRACE_MAX_STACK_BYTES || 64_000));
const MAX_STACK_LINES = Math.max(20, Number(process.env.DEBUG_TRACE_MAX_STACK_LINES || 80));
const MAX_OUTPUT_BYTES = Math.max(1_024, Number(process.env.DEBUG_TRACE_MAX_OUTPUT_BYTES || 120_000));
const MAX_TRACE_LINES = Math.max(20, Number(process.env.DEBUG_TRACE_MAX_LINES || 120));
const MAX_JSON_TRACE_STEPS = Math.max(20, Number(process.env.DEBUG_TRACE_MAX_JSON_STEPS || 300));

function toBoundedString(value, maxBytes) {
    return String(value || '').slice(0, maxBytes);
}

function sanitizeLine(line) {
    return String(line || '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim();
}

function parseJsFrame(line) {
    const withFn = /at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/.exec(line);
    if (withFn) {
        return {
            functionName: withFn[1],
            file: withFn[2],
            line: Number(withFn[3]),
            column: Number(withFn[4]),
            runtime: 'javascript',
        };
    }

    const noFn = /at\s+(.+?):(\d+):(\d+)/.exec(line);
    if (noFn) {
        return {
            functionName: '<anonymous>',
            file: noFn[1],
            line: Number(noFn[2]),
            column: Number(noFn[3]),
            runtime: 'javascript',
        };
    }

    return null;
}

function parsePythonFrame(line) {
    const match = /File\s+"(.+?)",\s+line\s+(\d+),\s+in\s+(.+)/.exec(line);
    if (!match) return null;

    return {
        functionName: match[3],
        file: match[1],
        line: Number(match[2]),
        column: null,
        runtime: 'python',
    };
}

function parseJavaFrame(line) {
    const match = /at\s+([\w.$<>]+)\(([^:()]+):(\d+)\)/.exec(line);
    if (!match) return null;

    return {
        functionName: match[1],
        file: match[2],
        line: Number(match[3]),
        column: null,
        runtime: 'java',
    };
}

function parseCppFrame(line) {
    const withFn = /at\s+(.+?)\s+\(([^:()]+\.(?:cpp|cc|cxx|c|hpp|h)):(\d+)\)/i.exec(line);
    if (withFn) {
        return {
            functionName: withFn[1],
            file: withFn[2],
            line: Number(withFn[3]),
            column: null,
            runtime: 'cpp',
        };
    }

    const plain = /([^\s:()]+\.(?:cpp|cc|cxx|c|hpp|h)):(\d+)/i.exec(line);
    if (plain) {
        return {
            functionName: '<native>',
            file: plain[1],
            line: Number(plain[2]),
            column: null,
            runtime: 'cpp',
        };
    }

    return null;
}

function parseErrorHeader(lines) {
    const nonEmpty = lines.filter(Boolean);
    if (!nonEmpty.length) {
        return {
            errorType: 'RuntimeError',
            message: 'Unknown runtime error',
            summary: 'Unknown runtime error',
        };
    }

    const tail = nonEmpty[nonEmpty.length - 1];
    const parts = tail.split(':');
    const errorType = (parts[0] || 'RuntimeError').trim() || 'RuntimeError';
    const message = sanitizeLine(parts.slice(1).join(':')) || sanitizeLine(tail);

    return {
        errorType,
        message,
        summary: `${errorType}${message ? `: ${message}` : ''}`,
    };
}

function parseTraceJson(output) {
    const bounded = toBoundedString(output, MAX_OUTPUT_BYTES);
    const markerIndex = Math.max(
        bounded.lastIndexOf('___TRACE_START___'),
        bounded.lastIndexOf('___TRACE___'),
    );

    if (markerIndex < 0) return null;

    const markerLength = bounded.startsWith('___TRACE_START___', markerIndex)
        ? '___TRACE_START___'.length
        : '___TRACE___'.length;

    const jsonSegment = bounded.slice(markerIndex + markerLength).trim();
    if (!jsonSegment) return null;

    try {
        const parsed = JSON.parse(jsonSegment);
        if (!Array.isArray(parsed)) return null;

        return parsed.slice(0, MAX_JSON_TRACE_STEPS).map((entry, index) => {
            const lineNumber = Number(entry?.line || entry?.lineNumber || index + 1);
            const localsRaw = entry?.locals || entry?.variables || {};
            const locals = {};

            if (localsRaw && typeof localsRaw === 'object') {
                for (const [key, value] of Object.entries(localsRaw)) {
                    if (!key || key.length > 80) continue;
                    locals[key] = toBoundedString(value, 240);
                }
            }

            return {
                step: index + 1,
                lineNumber: Number.isFinite(lineNumber) && lineNumber > 0 ? lineNumber : (index + 1),
                event: sanitizeLine(entry?.event || 'line'),
                content: sanitizeLine(entry?.content || ''),
                locals,
            };
        });
    } catch {
        return null;
    }
}

export function parseStackTrace(error) {
    const raw = toBoundedString(error, MAX_STACK_BYTES);
    const lines = raw
        .split(/\r?\n/)
        .map((line) => sanitizeLine(line))
        .filter(Boolean)
        .slice(0, MAX_STACK_LINES);
    const header = parseErrorHeader(lines);

    const frames = [];
    for (const line of lines) {
        const jsFrame = parseJsFrame(line);
        if (jsFrame) {
            frames.push(jsFrame);
            continue;
        }

        const pyFrame = parsePythonFrame(line);
        if (pyFrame) {
            frames.push(pyFrame);
            continue;
        }

        const javaFrame = parseJavaFrame(line);
        if (javaFrame) {
            frames.push(javaFrame);
            continue;
        }

        const cppFrame = parseCppFrame(line);
        if (cppFrame) {
            frames.push(cppFrame);
        }
    }

    return {
        ...header,
        frames,
        raw: lines,
    };
}

export function buildTraceFromOutput(output) {
    const jsonTrace = parseTraceJson(output);
    if (jsonTrace && jsonTrace.length > 0) {
        return jsonTrace;
    }

    const bounded = toBoundedString(output, MAX_OUTPUT_BYTES);
    const lines = bounded
        .split(/\r?\n/)
        .map((line) => sanitizeLine(line))
        .filter(Boolean)
        .slice(0, MAX_TRACE_LINES);

    return lines.map((line, index) => {
        const lineMatch = /\bline\s+(\d+)\b/i.exec(line);
        const parsedLine = Number(lineMatch?.[1] || 0);
        return {
            step: index + 1,
            lineNumber: Number.isFinite(parsedLine) && parsedLine > 0 ? parsedLine : index + 1,
            content: line,
        };
    });
}
