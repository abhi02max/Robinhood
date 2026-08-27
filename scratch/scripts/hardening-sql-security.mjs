import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:3300';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_PATH = path.join(__dirname, 'hardening-sql-security-report.json');

async function requestSql(query, userId = 'tenant-a') {
  const started = Date.now();
  const response = await fetch(`${API_BASE}/api/execute/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': `sql-hardening-${Math.random().toString(36).slice(2, 10)}`,
    },
    body: JSON.stringify({ query, userId }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    status: response.status,
    durationMs: Date.now() - started,
    payload,
  };
}

async function main() {
  const tests = [
    {
      name: 'allow_basic_select',
      query: 'SELECT id, name FROM departments ORDER BY id LIMIT 5',
      expectSuccess: true,
    },
    {
      name: 'effective_role_is_sandbox_reader',
      query: 'SELECT current_user',
      expectSuccess: true,
      validate: (payload) => payload?.output?.[0]?.current_user === 'sandbox_reader',
    },
    {
      name: 'block_pg_catalog',
      query: 'SELECT * FROM pg_catalog.pg_class LIMIT 1',
      expectSuccess: false,
      expectErrorRegex: /restricted/i,
    },
    {
      name: 'block_information_schema',
      query: 'SELECT table_name FROM information_schema.tables LIMIT 1',
      expectSuccess: false,
      expectErrorRegex: /restricted/i,
    },
    {
      name: 'block_pg_roles',
      query: 'SELECT * FROM pg_roles',
      expectSuccess: false,
      expectErrorRegex: /restricted/i,
    },
    {
      name: 'block_system_function_current_setting',
      query: "SELECT current_setting('server_version')",
      expectSuccess: false,
      expectErrorRegex: /restricted/i,
    },
    {
      name: 'block_pg_prefixed_function',
      query: 'SELECT pg_sleep(0.2)',
      expectSuccess: false,
      expectErrorRegex: /restricted/i,
    },
    {
      name: 'block_cross_schema_access',
      query: 'SELECT * FROM public.users LIMIT 1',
      expectSuccess: false,
      expectErrorRegex: /cross-schema|not allowed/i,
    },
    {
      name: 'block_non_allowlisted_table',
      query: 'SELECT * FROM accounts LIMIT 1',
      expectSuccess: false,
      expectErrorRegex: /allowlist/i,
    },
    {
      name: 'block_mutating_statement',
      query: 'DROP TABLE departments',
      expectSuccess: false,
      expectErrorRegex: /read-only|allowed/i,
    },
    {
      name: 'block_multi_statement',
      query: 'SELECT 1; SELECT 2',
      expectSuccess: false,
      expectErrorRegex: /multiple sql statements/i,
    },
    {
      name: 'row_isolation_tenant_a',
      query: "SELECT owner_id FROM customers WHERE full_name LIKE 'Tenant % Secret' ORDER BY owner_id",
      userId: 'tenant-a',
      expectSuccess: true,
      validate: (payload) => {
        const rows = Array.isArray(payload?.output) ? payload.output : [];
        return rows.length > 0 && rows.every((row) => row.owner_id === 'tenant-a');
      },
    },
    {
      name: 'row_isolation_tenant_b',
      query: "SELECT owner_id FROM customers WHERE full_name LIKE 'Tenant % Secret' ORDER BY owner_id",
      userId: 'tenant-b',
      expectSuccess: true,
      validate: (payload) => {
        const rows = Array.isArray(payload?.output) ? payload.output : [];
        return rows.length > 0 && rows.every((row) => row.owner_id === 'tenant-b');
      },
    },
  ];

  const results = [];

  for (const test of tests) {
    const response = await requestSql(test.query, test.userId || 'tenant-a');
    const payload = response.payload || {};
    const success = Boolean(payload.success);
    const errorText = String(payload.error || payload.reason || '');

    let pass;
    if (test.expectSuccess) {
      pass = success;
      if (pass && typeof test.validate === 'function') {
        pass = Boolean(test.validate(payload, response));
      }
    } else {
      pass = !success;
      if (pass && test.expectErrorRegex) {
        pass = test.expectErrorRegex.test(errorText);
      }
    }

    results.push({
      name: test.name,
      pass,
      expectedSuccess: test.expectSuccess,
      actualSuccess: success,
      status: response.status,
      durationMs: response.durationMs,
      error: errorText,
      responsePreview: payload,
    });
  }

  const blockedQueries = results
    .filter((entry) => entry.expectedSuccess === false && entry.actualSuccess === false)
    .map((entry) => entry.name);

  const summary = {
    total: results.length,
    passed: results.filter((entry) => entry.pass).length,
    failed: results.filter((entry) => !entry.pass).length,
    blockedQueries,
  };

  const report = {
    phase: 'sql-security-hardening',
    generatedAt: new Date().toISOString(),
    apiBase: API_BASE,
    summary,
    results,
  };

  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[hardening-sql] Report written to ${REPORT_PATH}`);
  console.log(`[hardening-sql] Passed ${summary.passed}/${summary.total}`);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[hardening-sql] Fatal error: ${error?.stack || error?.message || error}`);
  process.exitCode = 1;
});
