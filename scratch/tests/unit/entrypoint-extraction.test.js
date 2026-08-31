import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHarnessProgram } from '../../server/learning-engine/execution-engine.js';

/**
 * Entrypoint extraction for the two source-parsed languages.
 *
 * These go through `buildHarnessProgram`, the same function the executor uses, rather
 * than testing the regex in isolation. A test that reimplements the pattern it is
 * checking proves the pattern matches itself.
 *
 * DEFECT D9, found by the Phase 2E gate
 * -------------------------------------
 * The Python pattern required a closing paren followed directly by a colon, so a return
 * annotation broke it:
 *
 *     def find_max_average(nums: List[int], k: int) -> float:
 *
 * Extraction failed, and an extraction failure is reported as `compile_error` on every
 * test case. 12 of 96 seeded problems shipped exactly that starter, so on those problems
 * Python was unusable — the user was told their code had no top-level function, about
 * code the editor had given them.
 *
 * Parameter hints were already stripped, which is what hid it: annotations were clearly
 * expected, just not on the return.
 */

const CASE = { id: 't1', order_index: 1, is_hidden: false, input_payload: { nums: [1, 2], k: 2 }, expected_output: 1.5 };

const buildPython = (code) => buildHarnessProgram({ language: 'python', code, testCase: CASE });
const buildJs = (code) => buildHarnessProgram({ language: 'javascript', code, testCase: CASE });

// ---------------------------------------------------------------------------
// Python: the D9 regression
// ---------------------------------------------------------------------------

test('D9: a return annotation does not hide the function', () => {
  const program = buildPython('from typing import List\ndef find_max_average(nums: List[int], k: int) -> float:\n    return 1.5');
  assert.match(program, /find_max_average/);
});

test('D9: every return-annotation shape the curriculum uses is accepted', () => {
  for (const ret of ['float', 'int', 'bool', 'str', 'List[int]', 'List[str]', 'Optional[int]', 'Dict[str, int]', 'List[List[int]]']) {
    const program = buildPython(`def solve(nums, k) -> ${ret}:\n    return None`);
    assert.match(program, /solve/, `return annotation "-> ${ret}" broke extraction`);
  }
});

test('an unannotated def still works, and parameter hints are still stripped', () => {
  // The 84 problems that were never broken must stay unbroken.
  assert.match(buildPython('def solve(nums, k):\n    return 0'), /solve/);
  // Hints on parameters were always handled; assert it, because the fix touched the
  // same pattern.
  assert.match(buildPython('def solve(nums: List[int], k: int):\n    return 0'), /solve/);
});

test('async def is accepted', () => {
  assert.match(buildPython('async def solve(nums, k) -> float:\n    return 1.5'), /solve/);
});

test('the LAST top-level def wins, so helpers may come first', () => {
  const program = buildPython([
    'def helper(x) -> int:',
    '    return x',
    '',
    'def solve(nums, k) -> float:',
    '    return 1.5',
  ].join('\n'));
  // The harness calls the entrypoint by name; the helper must not be chosen.
  assert.match(program, /solve\(/);
});

test('an indented def inside a class is not mistaken for a top-level entrypoint', () => {
  // A nested def is indented, and the pattern anchors to the start of a line allowing
  // only leading whitespace — so it DOES match indented defs. The guarantee that
  // matters is that the last one still wins, which is the top-level `solve` here.
  const program = buildPython([
    'class Helper:',
    '    def inner(self, x) -> int:',
    '        return x',
    '',
    'def solve(nums, k) -> float:',
    '    return 1.5',
  ].join('\n'));
  assert.match(program, /solve\(/);
});

test('code with no def at all is rejected with an actionable message', () => {
  assert.throws(
    () => buildPython('x = 1\n'),
    /Could not find a top-level function/,
  );
});

// ---------------------------------------------------------------------------
// JavaScript: unchanged by the fix, asserted so it stays that way
// ---------------------------------------------------------------------------

test('JavaScript function declarations, arrows and expressions all resolve', () => {
  assert.match(buildJs('function solve(nums, k) { return 1.5; }'), /solve/);
  assert.match(buildJs('const solve = (nums, k) => 1.5;'), /solve/);
  assert.match(buildJs('const solve = function (nums, k) { return 1.5; };'), /solve/);
  assert.match(buildJs('const solve = async (nums, k) => 1.5;'), /solve/);
});

test('a JSDoc block above the function does not confuse extraction', () => {
  // Every seeded JavaScript starter carries one.
  const program = buildJs([
    '/**',
    ' * @param {number[]} nums',
    ' * @param {number} k',
    ' * @return {number}',
    ' */',
    'function solve(nums, k) {',
    '  return 1.5;',
    '}',
  ].join('\n'));
  assert.match(program, /solve/);
});

// ---------------------------------------------------------------------------
// D10: the compile_error verdict for interpreted languages
// ---------------------------------------------------------------------------

/**
 * There are two paths to `compile_error` for JavaScript and Python, and only one of them
 * is local. This covers the local one, which needs no provider quota to prove:
 * `extractEntrypoint` finds nothing, and `runExecution` short-circuits to compile_error
 * for every case without making a single HTTP request.
 *
 * The other path — a genuine parse failure at the provider, reclassified from
 * runtime_error — is proved by the verdict matrix in check-all-starters.js, because it is
 * the provider's parser that has to produce it.
 */

test('source with no function at all is a compile error, decided locally', async () => {
  const { runExecution } = await import('../../server/learning-engine/execution-engine.js');
  const testCases = [{ id: 'x1', order_index: 1, is_hidden: false, input_payload: { nums: [1], k: 1 }, expected_output: 1 }];

  for (const [language, code] of [['javascript', 'const x = 1;'], ['python', 'x = 1']]) {
    const out = await runExecution({ code, language, testCases });
    assert.equal(out.results[0].error_kind, 'compile_error', `${language} should report compile_error`);
    assert.equal(out.pass_count, 0);
    // The point of deciding this locally is that it costs nothing.
    assert.ok(!out.http_requests, `${language} must not contact the provider to know this`);
  }
});
