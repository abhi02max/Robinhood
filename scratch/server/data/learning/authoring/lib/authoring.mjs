/**
 * Authoring library for curriculum problems.
 *
 * WHY THIS EXISTS
 * ---------------
 * A v2 problem file is ~200 lines of JSON per problem, and the part that decides
 * whether the platform tells the user the truth — `expected_output` on every test
 * case — is the part a human is worst at producing by hand. Hand-computed expected
 * outputs are how you ship a problem where the correct answer is graded Wrong.
 *
 * So authors write a *spec*: prose, two reference solutions (JavaScript and Python),
 * and a list of input payloads. This library computes every `expected_output` by
 * running the reference, and refuses to emit anything unless three independent
 * things agree:
 *
 *   1. the JavaScript reference,
 *   2. the Python reference (a separately written implementation, not a transcription),
 *   3. the brute-force solution, which is usually the one whose correctness is obvious.
 *
 * On top of that, every worked example carries a hand-stated `expect` taken from the
 * problem statement. If the references agree with each other but disagree with the
 * stated answer, they are consistently wrong and the build fails. Agreement between
 * two implementations catches typos; agreement with a stated example catches
 * misunderstanding the problem.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not check that the *problem* is worth solving, that the prose is accurate,
 * or that the hidden cases are adversarial enough. Those stay the author's job.
 *
 * HARNESS CONTRACT THE SPECS MUST RESPECT (see execution-engine.js)
 * ----------------------------------------------------------------
 *   - Arguments are passed BY NAME: every reference parameter name must be a key of
 *     the input payload, in both languages. A Python reference therefore uses the
 *     payload's spelling (`cardPoints`, not `card_points`) for parameters.
 *   - The LAST top-level function in the source is the entrypoint, so helpers go
 *     first. This library enforces that by extracting the same way the engine does.
 *   - Return values are compared with a deep equality that is exact for integers and
 *     tolerant for floats. Anything whose natural answer is a set must have its
 *     ordering pinned by the problem statement, and both references must produce that
 *     order.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inferSignature, renderCppStarter } from '../../../../scripts/lib/cpp-infer.mjs';
import { renderJavaStarter } from '../../../../languages/java.js';
import { renderCStarter } from '../../../../languages/c.js';
import { languageSupportsSignature } from '../../../../languages/registry.js';

const FLOAT_TOLERANCE = 1e-6;
const PY = process.env.PYTHON_BIN || 'python';

// ---------------------------------------------------------------------------
// Entrypoint extraction — deliberately the same rule as the execution engine.
// If these ever disagree, a problem passes authoring and fails at submit time.
// ---------------------------------------------------------------------------

export function extractEntrypoint(code, language) {
  const matches = [];
  if (language === 'javascript') {
    const patterns = [
      /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g,
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(([^)]*)\)\s*=>|function\s*\*?\s*\(([^)]*)\))/g,
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(code)) !== null) {
        matches.push({ index: m.index, name: m[1], paramsRaw: m[2] ?? m[3] ?? '' });
      }
    }
  } else {
    const re = /^[ \t]*def\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*:/gm;
    let m;
    while ((m = re.exec(code)) !== null) matches.push({ index: m.index, name: m[1], paramsRaw: m[2] });
  }
  if (!matches.length) throw new Error(`no top-level ${language} function found`);
  matches.sort((a, b) => a.index - b.index);
  const last = matches[matches.length - 1];
  const params = last.paramsRaw
    .split(',')
    .map((s) => s.trim())
    .map((s) => s.split('=')[0].trim())
    .map((s) => s.replace(/^\*+/, ''))
    .map((s) => s.replace(/:.*$/, '').trim())
    .filter(Boolean);
  return { name: last.name, params };
}

// ---------------------------------------------------------------------------
// Comparison — mirrors the engine's deepEqual, including the float tolerance.
// ---------------------------------------------------------------------------

export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a === 'number') {
    if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return Math.abs(a - b) <= FLOAT_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
  }
  if (typeof a !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  return ak.length === bk.length && ak.every((k) => deepEqual(a[k], b[k]));
}

// ---------------------------------------------------------------------------
// Running the references
// ---------------------------------------------------------------------------

/**
 * Compile a JavaScript reference into a callable.
 *
 * The code is repository content, not user submissions, so evaluating it is not the
 * sandboxing question the execution engine answers — nothing here ever runs a
 * submission.
 */
function compileJs(code) {
  const entry = extractEntrypoint(code, 'javascript');
  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function(`${code}\n;return ${entry.name};`);
    return { entry, fn: factory() };
  } catch (e) {
    if (e instanceof ReferenceError) {
      // Almost always a helper declared *inside* the entry function. The extractor
      // takes the last function definition it can see and does not know about
      // nesting, so it picks the helper — and so does the real grader, which means
      // this is a genuine authoring constraint rather than a quirk of the build.
      throw new Error(
        `${e.message} — the extracted entrypoint was "${entry.name}". Helper functions must be ` +
        `top-level and declared BEFORE the entry function; a helper nested inside it is picked ` +
        `as the entrypoint instead, by this build and by the grader alike.`,
      );
    }
    throw e;
  }
}

function runJs(code, payloads) {
  const { entry, fn } = compileJs(code);
  return {
    entry,
    outputs: payloads.map((payload) => {
      for (const p of entry.params) {
        if (!(p in payload)) throw new Error(`parameter "${p}" is missing from a test payload`);
      }
      // Deep-copy: an in-place reference must not corrupt the payload other
      // implementations are about to receive.
      const args = entry.params.map((p) => structuredClone(payload[p]));
      return fn(...args);
    }),
  };
}

/**
 * Run a Python reference over every payload in ONE interpreter process.
 *
 * One process per case would dominate the authoring loop; a build over a few dozen
 * problems does hundreds of these.
 */
function runPython(code, payloads) {
  const entry = extractEntrypoint(code, 'python');
  const driver = [
    code,
    '',
    'import json as __json, sys as __sys',
    '__cases = __json.loads(__sys.stdin.read())',
    '__out = []',
    'for __c in __cases:',
    `    __out.append(${entry.name}(${entry.params.map((p) => `__json.loads(__json.dumps(__c[${JSON.stringify(p)}]))`).join(', ')}))`,
    'print(__json.dumps(__out))',
    '',
  ].join('\n');

  const file = path.join(os.tmpdir(), `robinhood-authoring-${process.pid}-${Math.random().toString(36).slice(2)}.py`);
  fs.writeFileSync(file, driver, 'utf8');
  try {
    const stdout = execFileSync(PY, [file], {
      input: JSON.stringify(payloads),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    return { entry, outputs: JSON.parse(stdout) };
  } finally {
    fs.rmSync(file, { force: true });
  }
}

// ---------------------------------------------------------------------------
// Rendering the emitted JSON
//
// Emitted by hand rather than through JSON.stringify(doc, null, 2) so the result
// matches the layout of the hand-written files: one test case per line, compact.
// The seed-file editing tools in server/scripts/lib/ depend on that layout, and a
// reviewer has to read these diffs.
// ---------------------------------------------------------------------------

const q = (s) => JSON.stringify(s);

function renderStringArray(items, indent) {
  if (!items.length) return '[]';
  return `[\n${items.map((s) => `${indent}  ${q(s)}`).join(',\n')}\n${indent}]`;
}

function renderInlineStringArray(items) {
  return `[${items.map(q).join(', ')}]`;
}

function renderExample(ex, indent) {
  return [
    `${indent}{`,
    `${indent}  "input": ${q(ex.input)},`,
    `${indent}  "output": ${q(ex.output)},`,
    `${indent}  "explanation": ${q(ex.explanation)}`,
    `${indent}}`,
  ].join('\n');
}

function renderApproach(ap, indent) {
  const i2 = `${indent}  `;
  return [
    `${indent}{`,
    `${i2}"name": ${q(ap.name)},`,
    `${i2}"summary": ${q(ap.summary)},`,
    `${i2}"intuition": ${q(ap.intuition)},`,
    `${i2}"steps": ${renderStringArray(ap.steps, i2)},`,
    `${i2}"code": {`,
    `${i2}  "javascript": ${q(ap.code.javascript)},`,
    `${i2}  "python": ${q(ap.code.python)}`,
    `${i2}},`,
    `${i2}"time_complexity": ${q(ap.time_complexity)},`,
    `${i2}"space_complexity": ${q(ap.space_complexity)}`,
    `${indent}}`,
  ].join('\n');
}

function renderTestCase(tc, indent) {
  const parts = [
    `"input_payload": ${JSON.stringify(tc.input_payload)}`,
    `"expected_output": ${JSON.stringify(tc.expected_output)}`,
    `"is_hidden": ${tc.is_hidden}`,
    `"order_index": ${tc.order_index}`,
  ];
  if (tc.label) parts.push(`"label": ${q(tc.label)}`);
  return `${indent}{ ${parts.join(', ')} }`;
}

function renderCppSignature(sig, indent) {
  const i2 = `${indent}  `;
  const argLine = (a) => `{ "name": ${q(a.name)}, "type": ${q(a.type)} }`;
  const args = sig.args.length === 1
    ? `[${argLine(sig.args[0])}]`
    : `[\n${sig.args.map((a) => `${i2}  ${argLine(a)}`).join(',\n')}\n${i2}]`;
  return [
    `${indent}{`,
    `${i2}"fn": ${q(sig.fn)},`,
    `${i2}"class": ${q(sig.class)},`,
    `${i2}"args": ${args},`,
    `${i2}"ret": ${q(sig.ret)}`,
    `${indent}}`,
  ].join('\n');
}

/**
 * The generated starters, in a fixed order, with commas between but not after.
 *
 * Hand-threading `${x ? ',' : ''}` through each optional line was already fragile with
 * two languages and would not survive a third.
 */
const OPTIONAL_STARTER_LANGUAGES = ['cpp', 'java', 'c'];

function renderOptionalStarters(starterCode, indent) {
  const present = OPTIONAL_STARTER_LANGUAGES.filter((lang) => starterCode[lang]);
  return present.map((lang, i) => (
    `${indent}  ${q(lang)}: ${q(starterCode[lang])}${i < present.length - 1 ? ',' : ''}`
  ));
}

function renderProblem(pr, indent) {
  const i2 = `${indent}  `;
  const lines = [
    `${indent}{`,
    `${i2}"slug": ${q(pr.slug)},`,
    `${i2}"title": ${q(pr.title)},`,
    `${i2}"difficulty": ${q(pr.difficulty)},`,
    `${i2}"tags": ${renderInlineStringArray(pr.tags)},`,
  ];
  if (pr.companies?.length) lines.push(`${i2}"companies": ${renderInlineStringArray(pr.companies)},`);
  lines.push(
    `${i2}"description": ${q(pr.description)},`,
    `${i2}"real_world_analogy": ${q(pr.real_world_analogy)},`,
    `${i2}"examples": [\n${pr.examples.map((ex) => renderExample(ex, `${i2}  `)).join(',\n')}\n${i2}],`,
    `${i2}"constraints": ${renderStringArray(pr.constraints, i2)},`,
    `${i2}"edge_cases": ${renderStringArray(pr.edge_cases, i2)},`,
    `${i2}"hints": ${renderStringArray(pr.hints, i2)},`,
    `${i2}"approaches": [\n${pr.approaches.map((ap) => renderApproach(ap, `${i2}  `)).join(',\n')}\n${i2}],`,
    `${i2}"starter_code": {`,
    `${i2}  "javascript": ${q(pr.starter_code.javascript)},`,
    `${i2}  "python": ${q(pr.starter_code.python)}${renderOptionalStarters(pr.starter_code, i2).length ? ',' : ''}`,
    // Emitted in a fixed order, with the comma driven by whatever comes after, so the
    // rendered JSON stays valid whichever languages a given problem supports.
    ...renderOptionalStarters(pr.starter_code, i2),
    `${i2}},`,
    ...(pr.cpp_signature ? [`${i2}"cpp_signature": ${renderCppSignature(pr.cpp_signature, i2)},`] : []),
    `${i2}"time_complexity": ${q(pr.time_complexity)},`,
    `${i2}"space_complexity": ${q(pr.space_complexity)},`,
    `${i2}"test_cases": [\n${pr.test_cases.map((tc) => renderTestCase(tc, `${i2}  `)).join(',\n')}\n${i2}]`,
    `${indent}}`,
  );
  return lines.join('\n');
}

export function renderBundle({ topic, pattern, problems }) {
  return [
    '{',
    '  "$schema": "../../problem.schema.json",',
    '  "schema_version": "2.0",',
    `  "topic_slug": ${q(topic)},`,
    `  "pattern_slug": ${q(pattern)},`,
    '  "problems": [',
    problems.map((pr) => renderProblem(pr, '    ')).join(',\n'),
    '  ]',
    '}',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Spec -> problem
// ---------------------------------------------------------------------------

/** `nums = [1,2,3], k = 2` — how LeetCode renders an example's input. */
function renderInputString(payload) {
  return Object.entries(payload).map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join(', ');
}

/**
 * Turn one spec into a validated problem object.
 *
 * Throws on the first disagreement, with the payload in the message: a build that
 * says "case 7 disagrees" without saying which input is not actionable.
 */
export function buildProblem(spec, { topic, pattern }) {
  const problems = [];
  const errors = [];

  const examples = spec.examples || [];
  const extra = spec.cases || [];
  const all = [
    ...examples.map((e) => ({ ...e, hidden: false, isExample: true })),
    ...extra.map((cs) => ({ ...cs, hidden: cs.hidden !== false })),
  ];
  const payloads = all.map((cs) => cs.payload);

  // --- the three implementations ------------------------------------------
  const js = runJs(spec.optimal.js, payloads);
  const py = runPython(spec.optimal.py, payloads);

  if (js.entry.params.join(',') !== py.entry.params.join(',')) {
    errors.push(
      `parameter lists differ between languages: js(${js.entry.params.join(', ')}) vs ` +
      `py(${py.entry.params.join(', ')}) — the harness passes arguments by name, so they must match`,
    );
  }

  let brute = null;
  if (spec.brute) {
    const brutePayloads = all.map((cs, i) => (cs.skipBrute ? null : payloads[i]));
    const wanted = brutePayloads.filter((p) => p !== null);
    const got = runJs(spec.brute.js, wanted).outputs;
    let cursor = 0;
    brute = brutePayloads.map((p) => (p === null ? undefined : got[cursor++]));
  }

  // --- the spec's own stated constraints ----------------------------------
  //
  // Cross-checking implementations proves they agree; it does not prove the input is
  // legal. A test case that violates the problem statement — an unsorted array on a
  // problem that promises sorted input — makes every implementation agree on an
  // answer to a question the problem never asked. `assume` is the author's chance to
  // state the precondition as code so the build enforces it.
  if (spec.assume) {
    all.forEach((cs, i) => {
      let verdict;
      try {
        verdict = spec.assume(cs.payload);
      } catch (e) {
        verdict = `assume() threw: ${e.message}`;
      }
      if (verdict !== true) {
        errors.push(
          `case ${i + 1} (${JSON.stringify(cs.payload).slice(0, 120)}) violates the problem's constraints` +
          `${typeof verdict === 'string' ? `: ${verdict}` : ''}`,
        );
      }
    });
  }

  // --- agreement ----------------------------------------------------------
  all.forEach((cs, i) => {
    const where = `case ${i + 1} (${JSON.stringify(cs.payload).slice(0, 120)})`;
    if (!deepEqual(js.outputs[i], py.outputs[i])) {
      errors.push(`${where}: js -> ${JSON.stringify(js.outputs[i])} but python -> ${JSON.stringify(py.outputs[i])}`);
    }
    if (brute && brute[i] !== undefined && !deepEqual(js.outputs[i], brute[i])) {
      errors.push(`${where}: optimal -> ${JSON.stringify(js.outputs[i])} but brute force -> ${JSON.stringify(brute[i])}`);
    }
    if ('expect' in cs && !deepEqual(js.outputs[i], cs.expect)) {
      errors.push(`${where}: stated expected ${JSON.stringify(cs.expect)} but the reference produced ${JSON.stringify(js.outputs[i])}`);
    }
    if (cs.isExample && !('expect' in cs)) {
      errors.push(`${where}: worked examples must state \`expect\` so the reference is checked against the problem statement`);
    }
    if (js.outputs[i] === undefined) {
      errors.push(`${where}: the reference returned undefined`);
    }
  });

  if (errors.length) {
    const e = new Error(`${spec.slug}:\n  - ${errors.join('\n  - ')}`);
    e.authoring = true;
    throw e;
  }

  // --- assemble -----------------------------------------------------------
  const starter = spec.starter || {
    javascript: `function ${js.entry.name}(${js.entry.params.join(', ')}) {\n  // Your code here\n}`,
    python: `def ${py.entry.name}(${py.entry.params.join(', ')}):\n    pass`,
  };

  const problem = {
    slug: spec.slug,
    title: spec.title,
    difficulty: spec.difficulty,
    tags: [...new Set([topic, pattern, ...(spec.tags || [])])],
    companies: spec.companies || [],
    description: spec.description,
    real_world_analogy: spec.analogy,
    examples: examples.map((ex, i) => ({
      input: renderInputString(ex.payload),
      output: JSON.stringify(js.outputs[i]),
      explanation: ex.explanation,
    })).slice(0, 5),
    constraints: spec.constraints,
    edge_cases: spec.edgeCases,
    hints: spec.hints,
    approaches: [
      ...(spec.brute ? [{
        name: spec.brute.name,
        summary: spec.brute.summary,
        intuition: spec.brute.intuition,
        steps: spec.brute.steps,
        code: { javascript: spec.brute.js, python: spec.brute.py },
        time_complexity: spec.brute.time,
        space_complexity: spec.brute.space,
      }] : []),
      {
        name: spec.optimal.name,
        summary: spec.optimal.summary,
        intuition: spec.optimal.intuition,
        steps: spec.optimal.steps,
        code: { javascript: spec.optimal.js, python: spec.optimal.py },
        time_complexity: spec.optimal.time,
        space_complexity: spec.optimal.space,
      },
    ],
    starter_code: { javascript: starter.javascript ?? starter.js, python: starter.python ?? starter.py },
    time_complexity: spec.time || spec.optimal.time,
    space_complexity: spec.space || spec.optimal.space,
    test_cases: all.map((cs, i) => ({
      input_payload: cs.payload,
      expected_output: js.outputs[i],
      is_hidden: cs.hidden,
      order_index: i + 1,
      ...(cs.label ? { label: cs.label } : {}),
    })),
  };

  // C++ support is emitted here rather than backfilled afterwards. This function
  // rewrites the whole pattern file, so anything a later script spliced in would be
  // erased on the next build — silently removing C++ from problems that had it.
  //
  // A spec may opt out with `cppUnsupported: '<reason>'`, which omits both keys so the
  // problem is JavaScript/Python only. That exists for return types the harness has no
  // decoder for (vector<vector<string>>, for one). It must be a deliberate, stated
  // choice: emitting a starter with no signature would show the user a C++ function to
  // fill in and then refuse the submission, which the validator also rejects.
  if (spec.cppUnsupported) {
    problem.__cppSkipped = spec.cppUnsupported;
    return problem;
  }

  const inferred = inferSignature(problem);
  if (inferred.error) {
    const e = new Error(`${spec.slug}: cannot derive a C++ signature — ${inferred.error}`);
    e.authoring = true;
    throw e;
  }
  const starterCpp = renderCppStarter(inferred.signature);
  if (starterCpp.error) {
    const e = new Error(`${spec.slug}: cannot render a C++ starter — ${starterCpp.error}`);
    e.authoring = true;
    throw e;
  }
  problem.cpp_signature = inferred.signature;
  problem.starter_code.cpp = starterCpp.code;

  // Java, where the signature allows it. Capability is DERIVED per problem rather
  // than assumed: a language is offered on a problem only when it can express every
  // argument and return type in that problem's signature.
  const skippedLanguages = [];
  for (const [language, render] of [['java', renderJavaStarter], ['c', renderCStarter]]) {
    const verdict = languageSupportsSignature(language, inferred.signature);
    if (!verdict.supported) {
      skippedLanguages.push(`${language}: ${verdict.reason}`);
      continue;
    }
    const starter = render(inferred.signature);
    if (starter.error) {
      const e = new Error(`${spec.slug}: cannot render a ${language} starter — ${starter.error}`);
      e.authoring = true;
      throw e;
    }
    problem.starter_code[language] = starter.code;
  }
  if (skippedLanguages.length) problem.__languagesSkipped = skippedLanguages;

  return problem;
}
