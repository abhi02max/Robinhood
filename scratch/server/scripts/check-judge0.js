#!/usr/bin/env node
/**
 * Judge0 preflight check.
 *
 *     node server/scripts/check-judge0.js
 *
 * Run this immediately after putting a RapidAPI key in scratch/.env.local. It
 * answers the three questions that block real code execution, and costs about
 * four HTTP requests against your quota:
 *
 *   1. Does the key authenticate?
 *   2. Do the language IDs hardcoded in execution-engine.js match this instance?
 *      (They are documented for CE 1.13.x and MUST NOT be trusted blindly --
 *      a wrong ID means submissions get compiled by the wrong compiler.)
 *   3. Does the batch create + poll flow actually work end to end? The official
 *      host does not enable `wait=true`, so this is the only shape that works.
 *
 * The key is read from the environment and only ever sent as a request header.
 * It is never printed -- not even partially.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolved from this file, not from cwd: running the script from the repo root
// would otherwise pick up the docker-compose .env instead of scratch/.env.local.
// Same load order as server/index.js: .env first, then .env.local wins.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const BASE = (process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com').replace(/\/$/, '');
const KEY = process.env.JUDGE0_API_KEY || '';
const HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';

// Keep this table in sync with JUDGE0_LANG_ID in
// server/learning-engine/execution-engine.js.
const EXPECTED = {
  javascript: { id: 63, match: /^JavaScript/i },
  python: { id: 71, match: /^Python/i },
  cpp: { id: 54, match: /^C\+\+/i },
  csharp: { id: 51, match: /^C#/i },
};
// Not wired up yet -- reported so the later phases have real IDs to use.
const PLANNED = { java: /^Java\s*\(/i, c: /^C\s*\(/i };

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s) => (s ? Buffer.from(s, 'base64').toString('utf8') : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (KEY) {
    h['X-RapidAPI-Key'] = KEY;
    h['X-RapidAPI-Host'] = HOST;
  }
  return h;
}

let requests = 0;
async function call(url, init = {}) {
  requests += 1;
  const res = await fetch(url, { ...init, headers: headers() });
  const text = await res.text();
  if (!res.ok) {
    // Redact defensively: an upstream gateway could echo a request header.
    const body = KEY ? text.split(KEY).join('[redacted]') : text;
    throw new Error(`HTTP ${res.status} on ${url.replace(/tokens=[^&]*/, 'tokens=...')}\n  ${body.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

let failures = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => { failures += 1; console.log(`  FAIL  ${m}`); };

async function main() {
  console.log(`Judge0 preflight against ${BASE}`);
  console.log(`  key: ${KEY ? `configured (${KEY.length} chars)` : 'MISSING'}   host: ${HOST}\n`);

  if (!KEY && /rapidapi/i.test(BASE)) {
    console.log('JUDGE0_API_KEY is empty and the target is RapidAPI, which requires it.');
    console.log('Put the key in scratch/.env.local, then re-run.\n');
    process.exit(2);
  }

  // ---- 1. auth + language IDs -------------------------------------------
  console.log('1. GET /languages');
  const langs = await call(`${BASE}/languages`);
  ok(`authenticated; ${langs.length} languages available`);

  const byId = new Map(langs.map((l) => [l.id, l.name]));
  for (const [lang, { id, match }] of Object.entries(EXPECTED)) {
    const name = byId.get(id);
    if (!name) bad(`${lang}: id ${id} does not exist on this instance`);
    else if (!match.test(name)) bad(`${lang}: id ${id} is "${name}" -- WRONG LANGUAGE`);
    else ok(`${lang}: id ${id} = "${name}"`);
  }
  console.log('  --- IDs for languages not yet wired up ---');
  for (const [lang, match] of Object.entries(PLANNED)) {
    const hits = langs.filter((l) => match.test(l.name));
    console.log(hits.length
      ? `  INFO  ${lang}: ${hits.map((l) => `${l.id} = "${l.name}"`).join(', ')}`
      : `  INFO  ${lang}: no match found`);
  }

  // ---- 2. batch create + poll -------------------------------------------
  console.log('\n2. POST /submissions/batch  (two JS submissions: one prints, one throws)');
  const created = await call(`${BASE}/submissions/batch?base64_encoded=true`, {
    method: 'POST',
    body: JSON.stringify({
      submissions: [
        {
          language_id: EXPECTED.javascript.id,
          source_code: b64('const d = JSON.parse(require("fs").readFileSync(0, "utf8"));\nprocess.stdout.write("<<<OUT>>>" + JSON.stringify(d.a + d.b) + "<<<END>>>");\n'),
          stdin: b64('{"a":2,"b":2}'),
          cpu_time_limit: 5,
        },
        {
          language_id: EXPECTED.javascript.id,
          source_code: b64('throw new Error("intentional");\n'),
          stdin: b64('{}'),
          cpu_time_limit: 5,
        },
      ],
    }),
  });

  if (!Array.isArray(created) || created.length !== 2) {
    bad(`expected a positional array of 2, got ${JSON.stringify(created).slice(0, 200)}`);
    return;
  }
  const tokens = created.map((c) => c && c.token).filter(Boolean);
  if (tokens.length !== 2) {
    bad(`batch was partially rejected: ${JSON.stringify(created).slice(0, 300)}`);
    return;
  }
  ok('batch accepted; 2 tokens issued');

  console.log('\n3. GET /submissions/batch  (polling -- `wait=true` is not available)');
  const fields = 'token,stdout,stderr,compile_output,message,status,time,memory,exit_code';
  let done = [];
  let delay = 400;
  for (let attempt = 1; attempt <= 20; attempt++) {
    await sleep(delay);
    delay = Math.min(Math.round(delay * 1.5), 3000);
    const got = await call(
      `${BASE}/submissions/batch?tokens=${tokens.join(',')}&base64_encoded=true&fields=${fields}`,
    );
    const subs = got.submissions || [];
    const pending = subs.filter((s) => (s?.status?.id ?? 0) <= 2).length;
    console.log(`  poll ${attempt}: ${subs.map((s) => s?.status?.description || '?').join(', ')}`);
    if (pending === 0) { done = subs; break; }
  }
  if (done.length !== 2) { bad('submissions never reached a terminal status'); return; }

  const [good, thrown] = done;
  const stdout = unb64(good.stdout);
  if (/<<<OUT>>>4<<<END>>>/.test(stdout)) ok('program ran and the harness sentinel came back intact');
  else bad(`unexpected stdout: ${JSON.stringify(stdout).slice(0, 200)}`);

  const thrownId = thrown?.status?.id ?? 0;
  if (thrownId >= 7 && thrownId <= 12) ok(`a thrown error maps to a runtime error (status ${thrownId})`);
  else bad(`a thrown error reported status ${thrownId} (${thrown?.status?.description})`);
  const stderr = unb64(thrown.stderr) || unb64(thrown.compile_output);
  if (/intentional/.test(stderr)) ok('stderr reaches us decoded');
  else bad(`stderr did not contain the thrown message: ${JSON.stringify(stderr).slice(0, 200)}`);

  console.log(`\n  runtime reported: ${good.time}s, memory: ${good.memory}KB`);
  console.log(`  Node version note: language id ${EXPECTED.javascript.id} is "${byId.get(EXPECTED.javascript.id)}".`);
}

main()
  .then(() => {
    console.log(`\n${requests} HTTP requests used.`);
    if (failures) {
      console.log(`${failures} check(s) FAILED -- do not flip EXECUTION_PROVIDER to judge0 yet.`);
      process.exit(1);
    }
    console.log('All checks passed. Set EXECUTION_PROVIDER=judge0 in scratch/.env.local.');
  })
  .catch((e) => {
    console.error(`\nPreflight aborted: ${e.message}`);
    console.error('\n429 with no key set = not subscribed. 401/403 = bad or unsubscribed key.');
    process.exit(1);
  });
