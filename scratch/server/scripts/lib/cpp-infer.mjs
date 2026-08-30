/**
 * C++ signature inference and starter rendering.
 *
 * WHY THIS IS SHARED
 * ------------------
 * Three callers need the same answer to "what is this problem's C++ shape?":
 *
 *   - backfill-cpp-signatures.js  — retrofits legacy problems that predate C++ support
 *   - backfill-cpp-starters.js    — renders the editor starter from that shape
 *   - build-authored-problems.js  — emits both directly, because it rewrites the whole
 *                                   file from a spec and would otherwise erase them
 *
 * The third is the reason this file exists. When the builder regenerated a pattern
 * file it dropped `cpp_signature` and `starter_code.cpp`, silently removing C++
 * support from every problem it touched, and the only symptom was a user being told
 * "C++ not supported for this problem" on a problem that had worked the day before.
 *
 * Types come from CPP_TYPE_MAP in the execution engine, imported rather than copied,
 * so nothing here can name a type the harness would refuse to compile.
 */
import { CPP_TYPE_MAP, normalizeCppType } from '../../learning-engine/execution-engine.js';

// Two's complement is not symmetric: INT32_MIN is representable but its absolute
// value is not. Testing Math.abs(v) > INT32_MAX widened exactly -2147483648 to
// `long long`, which then propagated into vector<vector<long long>> — a type the
// harness has no decoder for — and rejected otherwise fine problems.
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

/** The declaration the harness uses for a type, or null if it does not know it. */
export function declOf(type) {
  const entry = CPP_TYPE_MAP[normalizeCppType(type)];
  return entry ? entry.decl : null;
}

// ---------------------------------------------------------------------------
// Type inference over observed JSON values
//
// Inference merges EVERY test case, never just the first. A problem whose answer is
// 5 in one case and 12.75 in another is `double`; deciding from case one alone emits
// `int` and silently truncates every fractional answer.
// ---------------------------------------------------------------------------

/**
 * Describe one JSON value as a lattice point that can be merged with others.
 * `unknown` is the identity element: an empty array carries no element type, and
 * `null` (LeetCode's absent-value marker) says nothing either.
 */
export function describe(v) {
  if (v === null || v === undefined) return { kind: 'unknown' };
  if (typeof v === 'boolean') return { kind: 'bool' };
  if (typeof v === 'string') return { kind: 'string' };
  if (typeof v === 'number') {
    if (!Number.isInteger(v)) return { kind: 'double' };
    return { kind: (v < INT32_MIN || v > INT32_MAX) ? 'long long' : 'int' };
  }
  if (Array.isArray(v)) {
    let elem = { kind: 'unknown' };
    for (const item of v) elem = merge(elem, describe(item));
    return { kind: 'array', elem };
  }
  return { kind: 'unsupported', detail: typeof v === 'object' ? 'object' : typeof v };
}

/** Least upper bound of two descriptions. */
export function merge(a, b) {
  if (a.kind === 'unknown') return b;
  if (b.kind === 'unknown') return a;
  if (a.kind === 'unsupported') return a;
  if (b.kind === 'unsupported') return b;

  if (a.kind === 'array' && b.kind === 'array') {
    return { kind: 'array', elem: merge(a.elem, b.elem) };
  }
  if (a.kind === b.kind) return a;

  // Numeric widening: int ⊂ long long ⊂ double, so the widest wins. Anything else
  // disagreeing means the data mixes types C++ cannot express in one slot.
  const numeric = new Set(['int', 'long long', 'double']);
  if (numeric.has(a.kind) && numeric.has(b.kind)) {
    if (a.kind === 'double' || b.kind === 'double') return { kind: 'double' };
    return { kind: 'long long' };
  }
  return { kind: 'conflict', detail: `${a.kind} vs ${b.kind}` };
}

/** Render a description as a C++ type the harness knows, or return a reason it cannot. */
export function toCppType(d) {
  switch (d.kind) {
    case 'int': case 'long long': case 'double': case 'bool': case 'string':
      return { type: d.kind };
    case 'array': {
      if (d.elem.kind === 'unknown') {
        return { error: 'array element type unknown (every observed array was empty)' };
      }
      if (d.elem.kind === 'array') {
        if (d.elem.elem.kind === 'int') return { type: 'vector<vector<int>>' };
        return { error: `unsupported nested array of ${d.elem.elem.kind}` };
      }
      const inner = toCppType(d.elem);
      if (inner.error) return inner;
      return { type: `vector<${inner.type}>` };
    }
    case 'unknown':
      return { error: 'no non-null values observed' };
    case 'conflict':
      return { error: `inconsistent types across test cases (${d.detail})` };
    default:
      return { error: `unsupported JSON type ${d.detail || d.kind}` };
  }
}

/**
 * Pull the entrypoint name and parameter order out of the JavaScript starter.
 *
 * Only the parameter ORDER comes from here; every type comes from the test data.
 * Handles `function f(a, b) {}`, `const f = (a, b) => {}` and `var f = function
 * (a, b)`, which is everything the seed files use.
 */
export function parseJsStarter(src) {
  const code = String(src || '');
  let m = code.match(/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/);
  if (!m) m = code.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/);
  if (!m) m = code.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\s*\(([^)]*)\)/);
  if (!m) return null;

  const params = m[2]
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    // Defaults and destructuring would not map onto a C++ parameter list.
    .map((p) => p.replace(/=.*$/, '').trim());

  if (params.some((p) => !/^[A-Za-z_$][\w$]*$/.test(p))) return null;
  return { fn: m[1], params };
}

/**
 * Infer a problem's `cpp_signature` from its JavaScript starter and its test data.
 *
 * Returns `{ signature }` or `{ error }`. Failure is loud by design: a guessed-wrong
 * type produces a compile error the user cannot act on, while a missing signature
 * produces a clear "C++ not supported for this problem" message.
 */
export function inferSignature(problem) {
  const starter = parseJsStarter(problem.starter_code?.javascript);
  if (!starter) {
    return { error: 'could not parse a function name and parameters from starter_code.javascript' };
  }

  const cases = Array.isArray(problem.test_cases) ? problem.test_cases : [];
  if (!cases.length) return { error: 'no test cases to infer types from' };

  const argDesc = new Map(starter.params.map((p) => [p, { kind: 'unknown' }]));
  let retDesc = { kind: 'unknown' };
  const unexpectedKeys = new Set();

  for (const tcase of cases) {
    const payload = tcase.input_payload ?? {};
    for (const [k, v] of Object.entries(payload)) {
      if (!argDesc.has(k)) { unexpectedKeys.add(k); continue; }
      argDesc.set(k, merge(argDesc.get(k), describe(v)));
    }
    retDesc = merge(retDesc, describe(tcase.expected_output));
  }

  const problems = [];
  if (unexpectedKeys.size) {
    // The harness decodes arguments by name from the payload, so a key the starter
    // does not declare would be silently dropped.
    problems.push(`test cases carry keys absent from the JS parameter list: ${[...unexpectedKeys].join(', ')}`);
  }

  const args = [];
  for (const name of starter.params) {
    const res = toCppType(argDesc.get(name));
    if (res.error) { problems.push(`argument "${name}": ${res.error}`); continue; }
    if (!declOf(res.type)) { problems.push(`argument "${name}": ${res.type} is not in CPP_TYPE_MAP`); continue; }
    args.push({ name, type: res.type });
  }

  const ret = toCppType(retDesc);
  if (ret.error) problems.push(`return type: ${ret.error}`);
  else if (!declOf(ret.type)) problems.push(`return type ${ret.type} is not in CPP_TYPE_MAP`);

  if (problems.length) return { error: problems.join('; ') };

  return { signature: { fn: starter.fn, class: 'Solution', args, ret: ret.type } };
}

// ---------------------------------------------------------------------------
// Starter rendering
// ---------------------------------------------------------------------------

/**
 * Pass containers by reference and scalars by value — LeetCode's convention.
 * `string` is a container by size but LeetCode passes it by value, and copying it
 * costs nothing at these input sizes, so it stays by value for familiarity.
 */
function renderParam(name, decl) {
  return decl.startsWith('vector<') ? `${decl}& ${name}` : `${decl} ${name}`;
}

/**
 * Render the C++ starter as it will appear in the editor.
 *
 * Returns `{ code, summary }` or `{ error }`. The body is `return {};` rather than
 * empty: an empty body with a non-void return type is undefined behaviour, so an
 * untouched starter would fail with a garbage value or a crash unrelated to the
 * user's reasoning. `return {};` value-initializes every type in CPP_TYPE_MAP, which
 * makes an untouched starter a deterministic Wrong Answer.
 */
export function renderCppStarter(sig) {
  const problems = [];

  const retDecl = declOf(sig.ret);
  if (!retDecl) problems.push(`return type "${sig.ret}" is not in CPP_TYPE_MAP`);

  const params = [];
  for (const arg of sig.args || []) {
    const decl = declOf(arg.type);
    if (!decl) {
      problems.push(`argument "${arg.name}": type "${arg.type}" is not in CPP_TYPE_MAP`);
      continue;
    }
    params.push(renderParam(arg.name, decl));
  }

  if (!sig.fn) problems.push('cpp_signature.fn is missing');
  if (problems.length) return { error: problems.join('; ') };

  const className = (typeof sig.class === 'string' && sig.class.trim()) || 'Solution';

  return {
    code: [
      '#include <bits/stdc++.h>',
      'using namespace std;',
      '',
      `class ${className} {`,
      'public:',
      `    ${retDecl} ${sig.fn}(${params.join(', ')}) {`,
      '        // Write your solution here.',
      '        return {};',
      '    }',
      '};',
      '',
    ].join('\n'),
    summary: `${retDecl} ${sig.fn}(${params.join(', ')})`,
  };
}
