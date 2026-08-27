function sanitizeIdentifier(value, fallback) {
  const raw = String(value || '').trim().toLowerCase();
  if (/^[a-z_][a-z0-9_]*$/.test(raw)) return raw;
  return fallback;
}

function parseAllowlist(raw, defaults) {
  const fromEnv = String(raw || '')
    .split(',')
    .map((item) => sanitizeIdentifier(item, ''))
    .filter(Boolean);

  const merged = fromEnv.length ? fromEnv : defaults;
  return new Set(merged);
}

function normalizeSqlName(rawName) {
  return String(rawName || '')
    .replace(/"/g, '')
    .trim()
    .toLowerCase();
}

function extractCteNames(query) {
  const cteNames = new Set();
  const withMatch = query.match(/^\s*with\b([\s\S]+?)\bselect\b/i);
  if (!withMatch) return cteNames;

  const cteSegment = withMatch[1];
  const cteRegex = /\b([a-z_][a-z0-9_]*)\s+as\s*\(/ig;
  let match = cteRegex.exec(cteSegment);
  while (match) {
    cteNames.add(normalizeSqlName(match[1]));
    match = cteRegex.exec(cteSegment);
  }

  return cteNames;
}

const SANDBOX_SCHEMA = sanitizeIdentifier(process.env.SQL_SANDBOX_SCHEMA, 'sandbox_data');
const SQL_MAX_ROWS = Math.max(1, Number(process.env.SQL_SANDBOX_MAX_ROWS || 100));
const DEFAULT_ALLOWED_TABLES = ['departments', 'employees', 'products', 'orders', 'customers', 'sales'];
const ALLOWED_TABLES = parseAllowlist(process.env.SQL_SANDBOX_ALLOWED_TABLES, DEFAULT_ALLOWED_TABLES);

const DISALLOWED_PATTERNS = [
  /\b(?:insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|vacuum|analyze|comment|refresh|reindex|cluster|do|call|execute|prepare|deallocate|listen|notify|set|reset|show|begin|commit|rollback|savepoint|lock)\b/i,
  /\bpg_catalog\b/i,
  /\binformation_schema\b/i,
  /\bpg_authid\b/i,
  /\bpg_roles\b/i,
  /\bpg_shadow\b/i,
  /\bpg_user\b/i,
  /\bpg_proc\b/i,
  /\bpg_settings\b/i,
  /\bpg_stat\b/i,
  /\bpg_database\b/i,
  /\bpg_tablespace\b/i,
  /(?:^|[^a-z0-9_])current_setting\s*\(/i,
  /(?:^|[^a-z0-9_])set_config\s*\(/i,
  /(?:^|[^a-z0-9_])version\s*\(/i,
  /\bpg_[a-z0-9_]+\s*\(/i,
];

const ALLOWED_FUNCTIONS = new Set([
  'count',
  'sum',
  'avg',
  'min',
  'max',
  'coalesce',
  'nullif',
  'greatest',
  'least',
  'round',
  'abs',
  'upper',
  'lower',
  'length',
  'char_length',
  'substring',
  'substr',
  'concat',
  'trim',
  'ltrim',
  'rtrim',
  'date_trunc',
  'date_part',
  'extract',
  'to_char',
  'cast',
]);

const NON_FUNCTION_TOKENS = new Set([
  'select',
  'from',
  'where',
  'and',
  'or',
  'on',
  'in',
  'as',
  'case',
  'when',
  'then',
  'else',
  'end',
  'distinct',
  'order',
  'group',
  'having',
  'limit',
  'offset',
  'exists',
  'between',
  'not',
  'join',
  'left',
  'right',
  'inner',
  'outer',
  'cross',
  'with',
  'union',
]);

function validateFunctionAllowlist(query) {
  const fnRegex = /\b([a-z_][a-z0-9_]*)\s*\(/ig;
  let match = fnRegex.exec(query);

  while (match) {
    const fnName = normalizeSqlName(match[1]);
    if (NON_FUNCTION_TOKENS.has(fnName)) {
      match = fnRegex.exec(query);
      continue;
    }

    if (!ALLOWED_FUNCTIONS.has(fnName)) {
      throw new Error(`Function "${fnName}" is not allowed in sandbox mode.`);
    }

    match = fnRegex.exec(query);
  }
}

function validateTableAllowlist(query) {
  const cteNames = extractCteNames(query);
  const refRegex = /\b(?:from|join)\s+((?:"?[a-z_][a-z0-9_]*"?\.)?"?[a-z_][a-z0-9_]*"?)/ig;
  let match = refRegex.exec(query);

  while (match) {
    const rawRef = normalizeSqlName(match[1]);
    const [schemaCandidate, tableCandidate] = rawRef.includes('.')
      ? rawRef.split('.', 2)
      : [null, rawRef];

    const tableName = tableCandidate || schemaCandidate;
    const schemaName = rawRef.includes('.') ? schemaCandidate : null;

    if (cteNames.has(tableName)) {
      match = refRegex.exec(query);
      continue;
    }

    if (schemaName && schemaName !== SANDBOX_SCHEMA) {
      throw new Error(`Cross-schema access is blocked. Schema "${schemaName}" is not allowed.`);
    }

    if (!ALLOWED_TABLES.has(tableName)) {
      throw new Error(`Table "${tableName}" is outside the sandbox allowlist.`);
    }

    match = refRegex.exec(query);
  }
}

export function validateSqlQuery(rawQuery) {
  const query = String(rawQuery || '').trim();
  if (!query) {
    throw new Error('SQL query is empty.');
  }

  if (query.length > 5000) {
    throw new Error('SQL query is too large for sandbox mode.');
  }

  if (/--|\/\*/.test(query)) {
    throw new Error('SQL comments are not allowed in sandbox mode.');
  }

  const trimmed = query.replace(/;+\s*$/, '');
  if (trimmed.includes(';')) {
    throw new Error('Multiple SQL statements are not allowed.');
  }

  if (!/^\s*(select|with|explain\s+select)\b/i.test(trimmed)) {
    throw new Error('Only read-only SELECT queries are allowed.');
  }

  for (const pattern of DISALLOWED_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error('Query contains restricted system access patterns.');
    }
  }

  validateFunctionAllowlist(trimmed);
  validateTableAllowlist(trimmed);
  return trimmed;
}

export function applyRowLimit(query) {
  if (!/^\s*(select|with|explain\s+select)\b/i.test(query)) {
    return query;
  }

  if (/\blimit\s+\d+\b/i.test(query)) {
    return query;
  }

  return `${query} LIMIT ${SQL_MAX_ROWS}`;
}

export default {
  applyRowLimit,
  validateSqlQuery,
};
