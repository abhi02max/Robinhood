import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateAllProblemFiles, validateProblemBundle } from '../../server/scripts/validate-problem-schema.js';

/**
 * The 64-bit JSON ceiling — tracked architecture debt found in Phase 2E.
 *
 * Test-case values are stored as JSON and read with `JSON.parse`, so every number becomes
 * an IEEE-754 double and integers above 2^53-1 cannot round-trip:
 *
 *     JSON.parse('9007199254740993')  ->  9007199254740992
 *
 * The hazard is that this SUCCEEDS. A problem whose correct answer needs exact 64-bit
 * arithmetic would get a silently rounded `expected_output`, and every candidate with a
 * correct solution would then be graded wrong, with nothing in any log to explain it.
 *
 * The registry already declares `long long` and `vector<long long>` for C++, Java, C and
 * C#, and the harnesses emit correct 64-bit literals for them — the storage format is the
 * only part that cannot carry the value. So the validator refuses the case until expected
 * outputs are typed.
 *
 * These tests pin BOTH detection paths and, just as importantly, pin that the guard does
 * not fire on the existing curriculum. A guard that rejects valid content is worse than
 * no guard.
 */

const SAFE = Number.MAX_SAFE_INTEGER; // 9007199254740991

// ---------------------------------------------------------------------------
// Path 1: the parsed value
// ---------------------------------------------------------------------------

/**
 * A bundle whose FIRST test case is the one under examination.
 *
 * The per-case validator is only reached when `test_cases` has 10..25 entries, so the case
 * is padded out with benign ones. Everything else about the problem is left invalid on
 * purpose — the assertions filter for ceiling errors only, so the surrounding schema noise
 * is irrelevant and this stays a focused unit rather than a fixture to maintain.
 */
function bundleWithCase(testCase) {
  const filler = Array.from({ length: 9 }, (_, i) => ({
    is_hidden: true,
    order_index: i + 2,
    input_payload: { n: 1 },
    expected_output: 1,
  }));
  return {
    schema_version: '2.0',
    topic_slug: 'arrays',
    pattern_slug: 'prefix-sum',
    problems: [{
      slug: 'x',
      test_cases: [{ is_hidden: false, order_index: 1, ...testCase }, ...filler],
    }],
  };
}

const CEILING_ERROR = /exact-integer range|not representable|does not survive JSON\.parse/;

const errorsFor = (testCase) => validateProblemBundle(bundleWithCase(testCase), 'f.json').errors
  .filter((e) => CEILING_ERROR.test(e));

test('an expected_output above the safe range is rejected', () => {
  const errs = errorsFor({ input_payload: { n: 1 }, expected_output: SAFE + 2 });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /expected_output/);
  assert.match(errs[0], /outside the exact-integer range/);
});

test('a NEGATIVE value below the safe range is rejected too', () => {
  // Magnitude, not sign. A sign-blind check would let every negative 64-bit value through.
  const errs = errorsFor({ input_payload: { n: 1 }, expected_output: -(SAFE + 2) });
  assert.equal(errs.length, 1);
});

test('the boundary itself is allowed', () => {
  // 2^53-1 round-trips exactly, so refusing it would be needlessly strict.
  assert.deepEqual(errorsFor({ input_payload: { n: SAFE }, expected_output: SAFE }), []);
  assert.deepEqual(errorsFor({ input_payload: { n: -SAFE }, expected_output: -SAFE }), []);
});

test('an unsafe integer nested in an array or an object is found', () => {
  // The walk has to be recursive: vector<long long> is the type this debt actually blocks.
  assert.equal(errorsFor({ input_payload: { n: 1 }, expected_output: [1, 2, SAFE + 2] }).length, 1);
  assert.equal(errorsFor({ input_payload: { n: 1 }, expected_output: [[1], [SAFE + 2]] }).length, 1);
  assert.equal(errorsFor({ input_payload: { nums: [SAFE + 2] }, expected_output: 0 }).length, 1);
  assert.equal(errorsFor({ input_payload: { o: { deep: [{ x: SAFE + 2 }] } }, expected_output: 0 }).length, 1);
});

test('input_payload is checked as well as expected_output', () => {
  // An argument that cannot round-trip is as broken as an answer that cannot: the harness
  // compiles the rounded literal straight into the generated program.
  const errs = errorsFor({ input_payload: { n: SAFE + 2 }, expected_output: 0 });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /input_payload/);
});

test('ordinary values, non-integer floats, booleans, strings and null are untouched', () => {
  assert.deepEqual(errorsFor({ input_payload: { nums: [1, -3, 0, 2147483647] }, expected_output: 42 }), []);
  // A non-integer double is a `double` problem: compared under tolerance, not this guard's
  // business.
  assert.deepEqual(errorsFor({ input_payload: { x: 0.125 }, expected_output: 12.75 }), []);
  assert.deepEqual(errorsFor({ input_payload: { s: 'text' }, expected_output: null }), []);
  assert.deepEqual(errorsFor({ input_payload: { b: true }, expected_output: false }), []);
  assert.deepEqual(errorsFor({ input_payload: { a: [] }, expected_output: [] }), []);
});

test('a large value is refused even when the literal itself round-trips', () => {
  // Written when the first draft of this test assumed the opposite, and the guard was right.
  //
  // 2^60 is a power of two and survives JSON.parse exactly; so does 1e300. Neither is
  // caught by the raw-text check, and a magnitude rule is the only thing that catches them.
  // They are still refused, because the hazard is arithmetic rather than storage: above
  // 2^53 the gap between representable doubles exceeds 1, so a JavaScript reference
  // solution and the deepEqual comparison can both be wrong by an amount neither can see.
  //
  // This is conservative on purpose. Nothing in the curriculum needs a double of 1e300, and
  // refusing it costs nothing next to grading a correct solution as wrong.
  assert.equal(errorsFor({ input_payload: { n: 1 }, expected_output: 2 ** 60 }).length, 1);
  assert.equal(errorsFor({ input_payload: { x: 1e300 }, expected_output: 0 }).length, 1);
});

// ---------------------------------------------------------------------------
// Path 2: the raw file text
// ---------------------------------------------------------------------------

/**
 * Why a second check exists.
 *
 * The parsed-value check is authoritative for REJECTION — any decimal above 2^53-1 rounds
 * to a double that is still above 2^53-1, so nothing slips past. What it cannot do is tell
 * the author what they wrote, because by then the digits are gone. Reading the file text
 * lets the message quote the literal as authored and the value it silently became.
 */
async function withTempProblemFile(contents, fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rh-json-ceiling-'));
  const topicDir = path.join(dir, 'arrays');
  await fs.mkdir(topicDir, { recursive: true });
  const file = path.join(topicDir, 'prefix-sum.json');
  await fs.writeFile(file, contents, 'utf8');
  try {
    return await fn({ problemsDir: dir, file });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('a literal that loses precision is reported with the digits as authored', async () => {
  // 9007199254740993 becomes ...992. Only the raw text knows the original.
  const raw = JSON.stringify({ problems: [{ slug: 'x' }] }).replace('"x"', '"x", "v": 9007199254740993');
  await withTempProblemFile(raw, async ({ problemsDir }) => {
    const report = await validateAllProblemFiles({ problemsDir });
    assert.equal(report.ok, false);
    const hit = report.errors.find((e) => /does not survive JSON.parse/.test(e));
    assert.ok(hit, `expected a precision-loss error, got: ${report.errors.join(' | ')}`);
    assert.match(hit, /9007199254740993/, 'the message must quote what the author wrote');
    assert.match(hit, /9007199254740992/, 'and the value it became');
  });
});

test('a long literal that DOES round-trip is not reported', async () => {
  // 2^53 is 16 digits and exactly representable. Flagging by digit count alone would
  // reject it, so the check compares against the round-trip rather than the length.
  const raw = JSON.stringify({ problems: [{ slug: 'x' }] }).replace('"x"', '"x", "v": 9007199254740992');
  await withTempProblemFile(raw, async ({ problemsDir }) => {
    const report = await validateAllProblemFiles({ problemsDir });
    assert.equal(
      report.errors.filter((e) => /does not survive JSON.parse/.test(e)).length,
      0,
      'an exactly-representable literal must not be flagged by the raw-text check',
    );
  });
});

// ---------------------------------------------------------------------------
// The guard must not fire on real content
// ---------------------------------------------------------------------------

test('the existing 96-problem curriculum passes the ceiling check', async () => {
  // The whole point of a guard is that it is quiet until it matters. The curriculum's
  // largest input_payload is 101 bytes and nothing approaches 2^53, so any error here
  // would be a false positive.
  const report = await validateAllProblemFiles({});
  const ceiling = report.errors.filter((e) => CEILING_ERROR.test(e));
  assert.deepEqual(ceiling, [], 'the ceiling guard must not fire on current content');
});
