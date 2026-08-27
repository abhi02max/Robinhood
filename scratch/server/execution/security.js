import { z } from 'zod';
import { validateSqlQuery } from './sql-policy.js';

const CODE_MAX_BYTES = Math.max(1_024, Number(process.env.EXEC_CODE_MAX_BYTES || 120_000));
const STDIN_MAX_BYTES = Math.max(1_024, Number(process.env.EXEC_STDIN_MAX_BYTES || 20_000));
const SQL_MAX_BYTES = Math.max(256, Number(process.env.SQL_QUERY_MAX_BYTES || 5_000));
const TEST_CASE_LIMIT = Math.max(1, Number(process.env.EXEC_TESTCASE_LIMIT || 120));
const TEST_IO_MAX_BYTES = Math.max(256, Number(process.env.EXEC_TESTCASE_IO_MAX_BYTES || 12_000));

const SUPPORTED_RUN_LANGUAGES = new Set(['javascript', 'python', 'cpp', 'java', 'c', 'csharp', 'sql']);
const SUPPORTED_SUBMIT_LANGUAGES = new Set(['javascript', 'python', 'cpp', 'java', 'c', 'csharp']);

const aliasMap = {
  js: 'javascript',
  node: 'javascript',
  py: 'python',
  cplusplus: 'cpp',
  'c++': 'cpp',
  cs: 'csharp',
  'c#': 'csharp',
  postgres: 'sql',
};

function normalizeLanguage(value) {
  const raw = String(value || '').trim().toLowerCase();
  return aliasMap[raw] || raw;
}

function toSafeString(value, maxLength) {
  const safe = String(value ?? '');
  if (safe.length > maxLength) {
    return safe.slice(0, maxLength);
  }
  return safe;
}

function validationError(res, reason) {
  return res.status(400).json({
    errorType: 'VALIDATION_ERROR',
    reason,
  });
}

const runSchema = z.object({
  language: z.string().optional(),
  code: z.union([z.string(), z.number()]).optional(),
  source: z.union([z.string(), z.number()]).optional(),
  query: z.union([z.string(), z.number()]).optional(),
  stdin: z.union([z.string(), z.number()]).optional(),
  problemId: z.string().optional(),
}).strip();

const submitSchema = z.object({
  language: z.string(),
  code: z.union([z.string(), z.number()]),
  stdin: z.union([z.string(), z.number()]).optional(),
  problemId: z.string().optional(),
  testCases: z.array(
    z.object({
      input: z.union([z.string(), z.number()]).optional(),
      output: z.union([z.string(), z.number()]).optional(),
    }).strip(),
  ).max(TEST_CASE_LIMIT).optional(),
}).strip();

const sqlSchema = z.object({
  query: z.union([z.string(), z.number()]),
  userId: z.string().optional(),
}).strip();

function parseRunPayload(raw) {
  const parsed = runSchema.parse(raw || {});
  const language = normalizeLanguage(parsed.language || '');
  const code = toSafeString(parsed.code ?? parsed.source ?? '', CODE_MAX_BYTES).trim();
  const query = toSafeString(parsed.query ?? parsed.code ?? parsed.source ?? '', SQL_MAX_BYTES).trim();
  const stdin = toSafeString(parsed.stdin ?? '', STDIN_MAX_BYTES);

  if (!SUPPORTED_RUN_LANGUAGES.has(language)) {
    throw new Error('Unsupported language for execution.');
  }

  if (language === 'sql') {
    const validatedQuery = validateSqlQuery(query);
    return {
      language,
      code: validatedQuery,
      query: validatedQuery,
      stdin: '',
    };
  }

  if (!code) {
    throw new Error('Code snippet is required.');
  }

  return {
    language,
    code,
    stdin,
    problemId: parsed.problemId || null,
  };
}

function parseSubmitPayload(raw) {
  const parsed = submitSchema.parse(raw || {});
  const language = normalizeLanguage(parsed.language);
  if (!SUPPORTED_SUBMIT_LANGUAGES.has(language)) {
    throw new Error('Unsupported language for submit mode.');
  }

  const code = toSafeString(parsed.code, CODE_MAX_BYTES).trim();
  if (!code) {
    throw new Error('Code snippet is required.');
  }

  return {
    language,
    code,
    stdin: toSafeString(parsed.stdin ?? '', STDIN_MAX_BYTES),
    problemId: parsed.problemId || null,
    testCases: (parsed.testCases || []).map((testCase) => ({
      input: toSafeString(testCase.input ?? '', TEST_IO_MAX_BYTES),
      output: toSafeString(testCase.output ?? '', TEST_IO_MAX_BYTES),
    })),
  };
}

function parseSqlPayload(raw) {
  const parsed = sqlSchema.parse(raw || {});
  const query = validateSqlQuery(toSafeString(parsed.query, SQL_MAX_BYTES));
  return {
    query,
    userId: parsed.userId,
  };
}

function withParser(parseFn) {
  return function validator(req, res, next) {
    try {
      req.body = parseFn(req.body);
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues?.[0];
        return validationError(res, firstIssue?.message || 'Invalid request payload.');
      }
      return validationError(res, String(error?.message || 'Invalid request payload.'));
    }
  };
}

const validateRunRequest = withParser(parseRunPayload);
const validateSubmitRequest = withParser(parseSubmitPayload);
const validateSqlRequest = withParser(parseSqlPayload);

export { validateRunRequest, validateSubmitRequest, validateSqlRequest };
export default { validateRunRequest, validateSubmitRequest, validateSqlRequest };
