#!/usr/bin/env node
/**
 * End-to-end user-journey verification against a running stack.
 *
 * WHY THIS EXISTS ALONGSIDE smoke-api.mjs AND smoke-flows.mjs
 * ----------------------------------------------------------
 * Those two predate the authentication hardening. They send a fabricated user id
 * in the request body, which the server now correctly ignores, so both fail at
 * `/api/learn/session` with 401 and never reach the journeys they were written to
 * cover. This script authenticates properly and asserts the things a release gate
 * actually needs to know.
 *
 * It checks behaviour, not just status codes. Each case states what must be true
 * and why, so a failure names the user-visible consequence rather than a number.
 *
 * REQUIRES a running backend (default http://127.0.0.1:3000) and a seeded
 * database. Costs real provider requests — roughly 6 submissions.
 *
 *   node scripts/verify-journeys.mjs
 *   node scripts/verify-journeys.mjs --base http://127.0.0.1:3000
 */
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = flag('--base', 'http://127.0.0.1:3000');
const SLUG = flag('--slug', 'house-robber');

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const results = [];
function record(name, ok, detail, severity = 'fail') {
  results.push({ name, ok, detail, severity });
  const mark = ok ? c.green('PASS') : (severity === 'warn' ? c.yellow('WARN') : c.red('FAIL'));
  console.log(`${mark} ${name}`);
  if (detail) console.log(`       ${ok ? c.dim(detail) : (severity === 'warn' ? c.yellow(detail) : c.red(detail))}`);
}

async function call(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 300); }
  return { status: res.status, body: parsed };
}

// ---------------------------------------------------------------------------
// Reference solutions used as probes
// ---------------------------------------------------------------------------
const CORRECT_JS = `function rob(nums) {
  let twoBack = 0, oneBack = 0;
  for (const value of nums) {
    const best = Math.max(oneBack, twoBack + value);
    twoBack = oneBack;
    oneBack = best;
  }
  return oneBack;
}`;

// Passes every VISIBLE case by table lookup and returns 0 otherwise. If this is
// accepted, hidden cases are not being enforced and the whole grader is theatre.
const CHEAT_JS = `function rob(nums) {
  const table = { "1,2,3,1": 4, "2,7,9,3,1": 12, "5": 5, "2,1,1,2": 4 };
  const key = nums.join(",");
  return key in table ? table[key] : 0;
}`;

const THROWS_JS = `function rob(nums) {
  throw new Error("boom");
}`;

const CPP_SYNTAX_ERROR = `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int rob(vector<int>& nums) {
        return   // deliberately unterminated
    }
};`;

// ---------------------------------------------------------------------------
console.log(c.bold(`\n=== user journey verification against ${BASE} ===\n`));

// --- unauthenticated browsing -----------------------------------------------
const topics = await call('/api/learning/topics');
record(
  'browse: topics load without a session',
  topics.status === 200 && (topics.body.topics || topics.body)?.length > 0,
  `status ${topics.status}, ${(topics.body.topics || topics.body)?.length} topics`,
);

const detail = await call(`/api/learning/problem/${SLUG}`);
const problem = detail.body;
const visibleCount = (problem.test_cases || []).length;
record(
  'browse: problem detail loads with starter code',
  detail.status === 200 && !!problem.id && Object.keys(problem.starter_code || {}).length >= 3,
  `status ${detail.status}, starters: ${Object.keys(problem.starter_code || {}).join(', ')}, ${visibleCount} visible cases`,
);

// --- auth -------------------------------------------------------------------
const email = `journey-${Date.now()}@example.com`;
const password = 'Str0ng-Passw0rd!';

const signup = await call('/api/auth/signup', { method: 'POST', body: { email, password, name: 'Journey Bot' } });
record('auth: signup', signup.status === 201 || signup.status === 200, `status ${signup.status}`);

const login = await call('/api/auth/login', { method: 'POST', body: { email, password } });
const token = login.body.sessionToken;
record('auth: login issues a session token', login.status === 200 && !!token, `status ${login.status}`);

const me = await call('/api/auth/me', { token });
record('auth: session resolves to the right user', me.status === 200, `status ${me.status}`);

const wrongPassword = await call('/api/auth/login', { method: 'POST', body: { email, password: 'wrong-password' } });
record(
  'auth: a wrong password is rejected',
  wrongPassword.status >= 400,
  `status ${wrongPassword.status}`,
);

// --- authorization ----------------------------------------------------------
const noToken = await call(`/api/learning/attempts/${problem.id}`);
record(
  'authz: private endpoints reject an anonymous caller',
  noToken.status === 401,
  `status ${noToken.status}`,
);

const forgedToken = await call(`/api/learning/attempts/${problem.id}`, { token: 'not-a-real-token' });
record(
  'authz: a forged bearer token is rejected',
  forgedToken.status === 401,
  `status ${forgedToken.status}`,
);

// The server authenticates ONLY via Authorization: Bearer -- there is no session
// cookie. Any client that omits the header gets 401 on submit, which is exactly what
// the problem page did until the token was wired into its API layer. This assertion
// pins the contract so the omission cannot come back unnoticed.
const submitNoAuth = await call('/api/learning/submit', {
  method: 'POST',
  body: { problem_id: problem.id, language: 'javascript', code: CORRECT_JS },
});
record(
  'authz: submit without an Authorization header is rejected',
  submitNoAuth.status === 401,
  `status ${submitNoAuth.status} — the UI must send Bearer; there is no cookie fallback`,
);

// --- submission verdicts ----------------------------------------------------
const accepted = await call('/api/learning/submit', {
  method: 'POST', token, body: { problem_id: problem.id, language: 'javascript', code: CORRECT_JS },
});
record(
  'submit: a correct solution is Accepted on every case',
  accepted.body.status === 'Accepted' && accepted.body.pass_count === accepted.body.total_cases,
  `${accepted.body.status} ${accepted.body.pass_count}/${accepted.body.total_cases}`,
);

record(
  'submit: hidden cases are graded but never sent to the client',
  accepted.body.total_cases > visibleCount,
  `graded ${accepted.body.total_cases} cases, client received ${visibleCount}`,
);

const cheat = await call('/api/learning/submit', {
  method: 'POST', token, body: { problem_id: problem.id, language: 'javascript', code: CHEAT_JS },
});
record(
  'submit: a solution that only hardcodes the visible answers fails on a hidden case',
  cheat.body.status === 'Wrong Answer' && cheat.body.failed_test_case?.is_hidden === true,
  `${cheat.body.status} ${cheat.body.pass_count}/${cheat.body.total_cases}, failed case hidden=${cheat.body.failed_test_case?.is_hidden}`,
);

const threw = await call('/api/learning/submit', {
  method: 'POST', token, body: { problem_id: problem.id, language: 'javascript', code: THROWS_JS },
});
record(
  'submit: a throwing solution is reported as Runtime Error',
  threw.body.status === 'Runtime Error',
  `${threw.body.status} ${threw.body.pass_count}/${threw.body.total_cases}`,
);

// A compile error must say so. It used to be folded into 'Runtime Error', which
// sends a user with a missing semicolon off debugging logic instead of syntax.
const compileError = await call('/api/learning/submit', {
  method: 'POST', token, body: { problem_id: problem.id, language: 'cpp', code: CPP_SYNTAX_ERROR },
});
record(
  'submit: uncompilable C++ is reported as Compilation Error, not Runtime Error',
  compileError.body.status === 'Compilation Error',
  `${compileError.body.status} — ${String(compileError.body.failed_test_case?.message || '').slice(0, 120)}`,
);

record(
  'submit: an accepted solution is not told it was wrong',
  !/failing test input/i.test(String(accepted.body.contextual_hint?.message || '')),
  `hint: ${String(accepted.body.contextual_hint?.message || '(none)').slice(0, 100)}`,
);

// --- persistence ------------------------------------------------------------
// Exactly four submissions have been made through /api/learning/submit above.
const attempts = await call(`/api/learning/attempts/${problem.id}`, { token });
record(
  'persistence: every submission is stored and returned',
  attempts.status === 200 && attempts.body.total === 4,
  `${attempts.body.total} attempts (expected 4), pattern "${attempts.body.pattern_name}", topic "${attempts.body.topic_name}"`,
);

// --- Run vs Submit ----------------------------------------------------------
// Run is meant to be a scratchpad: visible cases only, nothing written down. If it
// persists, every exploratory click pollutes the user's attempt history and the
// accuracy metrics derived from it.
const runEndpoint = await call('/api/execute/run', {
  method: 'POST', token, body: { problemId: problem.id, language: 'javascript', code: CORRECT_JS },
});
record(
  'run: /api/execute/run grades ONLY the visible cases',
  runEndpoint.status === 200 && runEndpoint.body.total === visibleCount,
  `status ${runEndpoint.status}, graded ${runEndpoint.body.total} of ${visibleCount} visible`,
);

const attemptsAfterRun = await call(`/api/learning/attempts/${problem.id}`, { token });
record(
  'run: a Run does not create an attempt record',
  attemptsAfterRun.body.total === attempts.body.total,
  `${attempts.body.total} attempts before Run, ${attemptsAfterRun.body.total} after`,
);

const progress = await call('/api/learning/pattern-progress', { token });
const rows = progress.body.patterns || progress.body.progress || [];
const solved = rows.reduce((n, r) => n + Number(r.problems_solved || 0), 0);
record(
  'persistence: pattern progress reflects the solve',
  progress.status === 200 && solved >= 1,
  `${rows.length} pattern rows, ${solved} solved`,
);

const community = await call(`/api/learning/community/${problem.id}`);
record(
  'community: aggregate stats include the new submissions',
  community.status === 200 && community.body.total_submissions >= 5,
  `${community.body.total_submissions} submissions, solve rate ${community.body.solve_rate}`,
);

// --- logout -----------------------------------------------------------------
const logout = await call('/api/auth/logout', { method: 'POST', token });
record('auth: logout returns success', logout.status === 200, `status ${logout.status}`);

const afterLogout = await call('/api/auth/me', { token });
record(
  'auth: the token is dead after logout',
  afterLogout.status === 401,
  `status ${afterLogout.status}`,
);

// ---------------------------------------------------------------------------
const failed = results.filter((r) => !r.ok && r.severity !== 'warn');
const warned = results.filter((r) => !r.ok && r.severity === 'warn');
console.log(
  `\n${results.length} checks: ${c.green(`${results.length - failed.length - warned.length} passed`)}` +
  `${warned.length ? `, ${c.yellow(`${warned.length} warnings`)}` : ''}` +
  `${failed.length ? `, ${c.red(`${failed.length} failed`)}` : ''}`,
);
if (failed.length) {
  console.log(c.red('\nFailures:'));
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
}
console.log('');
process.exit(failed.length ? 1 : 0);
