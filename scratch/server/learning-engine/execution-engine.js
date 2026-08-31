/**
 * Real code execution engine for the learning platform.
 *
 *   POST /api/learning/submit  →  service  →  runExecution(...)
 *
 * Pluggable backends (selected at runtime via EXECUTION_PROVIDER env var):
 *
 *     "paiza"             — https://api.paiza.io  (free, api_key=guest, all six
 *                            languages; 1-second CPU cap we cannot raise)
 *     "judge0"            — https://judge0-ce.p.rapidapi.com (auth via RapidAPI
 *                            or self-hosted; paid on the hosted plans)
 *     "piston"  (default) — https://emkc.org/api/v2/piston   (self-hosted only:
 *                            the public API closed on 2026-02-15)
 *     "mock"              — falls back to ./execution-mock.js (offline / CI;
 *                            passes anything non-empty without running it)
 *
 * The function signature and return shape are IDENTICAL to runMockExecution
 * so the service layer can swap implementations without changes.
 *
 * --------------------------------------------------------------------------
 * Calling convention for user code (matches the curated starter snippets):
 *
 *   - The user's code defines exactly one top-level function whose
 *     parameter names line up with the keys of `input_payload`.
 *   - The harness extracts the function name + parameter names, reads
 *     input_payload from stdin as JSON, calls the function in declaration
 *     order, and writes JSON.stringify(returnValue) to stdout.
 *   - Helper functions are allowed; the LAST top-level function declaration
 *     in the source is treated as the entry point (this matches LeetCode's
 *     editor where the entry function is the last `function`/`def`).
 * --------------------------------------------------------------------------
 */

import { runMockExecution } from './execution-mock.js';
import {
  getLanguage,
  isExecutable,
  normalizeLanguage as registryNormalizeLanguage,
  normalizeType,
  providerLanguageId,
  providerMapping,
  typeDeclaration,
} from '../languages/registry.js';
import { buildJavaProgram, renderJavaStarter } from '../languages/java.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
function getProvider() {
  return (process.env.EXECUTION_PROVIDER || 'piston').toLowerCase();
}

function getJudge0Url() {
  return process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com';
}

// PISTON_URL means two different things in this repo: index.js:236 and
// execution/piston.js:3 treat it as the full ".../api/v2/execute" endpoint,
// while this module needs the API *base* and appends /execute itself. Setting
// it for one broke the other. Accept either form by stripping a trailing
// /execute, and let PISTON_BASE_URL override explicitly.
//
// Note the default is dead as a public service: emkc.org went whitelist-only on
// 2026-02-15 and now answers /execute with HTTP 401. It is kept only as the
// correct base path for a self-hosted instance.
const PISTON_URL = process.env.PISTON_BASE_URL
  || String(process.env.PISTON_URL || '').replace(/\/execute\/?$/, '')
  || 'https://emkc.org/api/v2/piston';

const JUDGE0_API_KEY  = process.env.JUDGE0_API_KEY  || '';
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';

const PER_TEST_TIMEOUT_MS = Number(process.env.EXECUTION_TIMEOUT_MS) || 5_000;
const HTTP_TIMEOUT_MS     = PER_TEST_TIMEOUT_MS + 4_000;
const CONCURRENCY         = Math.max(1, Number(process.env.EXECUTION_CONCURRENCY) || 4);
const MEMORY_MB           = Number(process.env.EXECUTION_MEMORY_MB) || 256;

// Language identity, provider ids and type tables all come from
// server/languages/registry.js now. Seven modules used to answer these questions
// independently and two of them disagreed about Judge0, so adding a language meant
// finding every copy and getting every copy right.

// Relative tolerance for comparing non-integral numbers. Problems that return a
// double (e.g. maximum-average-subarray-i, an average) cannot be compared with
// === : a correct solution that sums in a different order differs in the last
// bit. Integers are still compared exactly, so this cannot mask an off-by-one.
const FLOAT_TOLERANCE = Number(process.env.EXECUTION_FLOAT_TOLERANCE) || 1e-6;

/**
 * Normalize loose user-supplied language strings ("C++", "c++", "javascript")
 * to the canonical lowercase keys this module uses internally.
 */
const normalizeLanguage = registryNormalizeLanguage;

/**
 * Can the engine physically execute this language?
 *
 * This is deliberately the engine's own question, not the product's. It answers "is
 * there a harness builder", which during Phase 2 is true for a language well before
 * the API or the editor will accept it. Whether a *user* may submit in a language is
 * `canSubmit` in the registry, enforced at the service and security layers.
 */
export function isLanguageSupported(language) {
  return isExecutable(language);
}

// ---------------------------------------------------------------------------
// Error kinds (used internally; surfaced in result.error_kind)
// ---------------------------------------------------------------------------
export const ERROR_KIND = Object.freeze({
  WRONG_ANSWER:        'wrong_answer',
  RUNTIME_ERROR:       'runtime_error',
  COMPILE_ERROR:       'compile_error',
  TIME_LIMIT_EXCEEDED: 'time_limit_exceeded',
  HARNESS_ERROR:       'harness_error',
});

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  // Numbers: exact for integers, tolerance-based for anything fractional.
  // Reached only when a !== b already, so equal values never get here.
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return Math.abs(a - b) <= FLOAT_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
  }
  if (typeof a !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

/**
 * Race `promise` against a timeout. Rejects with `Error('timeout')` if the
 * deadline elapses first. Used to bound HTTP calls.
 */
function withTimeout(promise, ms, label = 'request') {
  let t;
  const timer = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timer]).finally(() => clearTimeout(t));
}

/**
 * Run `tasks` with a maximum of `limit` concurrent in-flight promises.
 * Preserves index order in the returned array.
 */
async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function next() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        results[i] = await worker(items[i], i);
      } catch (e) {
        results[i] = { __error: e };
      }
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, next);
  await Promise.all(runners);
  return results;
}

// ---------------------------------------------------------------------------
// Entrypoint extraction
// ---------------------------------------------------------------------------
/**
 * Find the LAST top-level function definition and return its name + params.
 * For JavaScript, supports:
 *     function name(a, b) {}
 *     const name = (a, b) => {}
 *     const name = function(a, b) {}
 * For Python:
 *     def name(a, b):
 *
 * Returns { name, params } where params is a string[] (empty if none).
 * Throws on failure so the service layer surfaces a clear validation error.
 */
function extractEntrypoint(code, language) {
  const lang = String(language).toLowerCase();
  const matches = [];

  if (lang === 'javascript') {
    const patterns = [
      // function NAME(args)
      /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g,
      // const NAME = (args) => OR const NAME = function(args)
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(([^)]*)\)\s*=>|function\s*\*?\s*\(([^)]*)\))/g,
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(code)) !== null) {
        matches.push({
          index: m.index,
          name: m[1],
          paramsRaw: m[2] !== undefined ? m[2] : (m[3] ?? ''),
        });
      }
    }
  } else if (lang === 'python') {
    const re = /^[ \t]*def\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*:/gm;
    let m;
    while ((m = re.exec(code)) !== null) {
      matches.push({ index: m.index, name: m[1], paramsRaw: m[2] });
    }
  } else {
    throw new Error(`Unsupported language for entrypoint extraction: ${language}`);
  }

  if (matches.length === 0) {
    throw new Error(
      `Could not find a top-level function in the submitted ${lang} code. ` +
      `Define a function whose parameter names match the input keys.`
    );
  }

  // Last definition wins: helper functions go first, entry function last.
  matches.sort((a, b) => a.index - b.index);
  const last = matches[matches.length - 1];

  const params = last.paramsRaw
    .split(',')
    .map((s) => s.trim())
    .map((s) => s.split('=')[0].trim())   // strip default values
    .map((s) => s.replace(/^\*+/, ''))    // strip *args / **kwargs prefix (py)
    .map((s) => s.replace(/:.*$/, '').trim()) // strip py type hints
    .filter(Boolean);

  return { name: last.name, params };
}

// ---------------------------------------------------------------------------
// Harness builders — append to user code; read stdin JSON, call fn, write JSON
// ---------------------------------------------------------------------------
function buildJavaScriptProgram(userCode, entry) {
  const argsList = JSON.stringify(entry.params); // e.g. ["nums","k"]
  // Sentinels in stdout let us isolate the JSON from any logs the user wrote.
  return `${userCode}

;(function () {
  'use strict';
  const __fs = require('fs');
  let __raw = '';
  try { __raw = __fs.readFileSync(0, 'utf8'); } catch (e) {}
  let __input;
  try {
    __input = __raw && __raw.trim() ? JSON.parse(__raw) : {};
  } catch (e) {
    process.stderr.write('Harness: failed to parse stdin JSON: ' + e.message);
    process.exit(2);
  }
  const __keys = ${argsList};
  const __args = __keys.map(function (k) { return __input[k]; });
  let __out;
  try {
    __out = ${entry.name}.apply(null, __args);
  } catch (e) {
    process.stderr.write('RuntimeError: ' + (e && e.stack ? e.stack : String(e)));
    process.exit(1);
  }
  if (__out && typeof __out.then === 'function') {
    Promise.resolve(__out).then(function (v) {
      process.stdout.write('<<<OUT>>>' + JSON.stringify(v === undefined ? null : v) + '<<<END>>>');
    }).catch(function (e) {
      process.stderr.write('RuntimeError: ' + (e && e.stack ? e.stack : String(e)));
      process.exit(1);
    });
  } else {
    process.stdout.write('<<<OUT>>>' + JSON.stringify(__out === undefined ? null : __out) + '<<<END>>>');
  }
})();
`;
}

function buildPythonProgram(userCode, entry) {
  const argsList = JSON.stringify(entry.params);
  return `${userCode}

import sys as __sys, json as __json
__raw = __sys.stdin.read()
try:
    __input = __json.loads(__raw) if __raw.strip() else {}
except Exception as __e:
    __sys.stderr.write('Harness: failed to parse stdin JSON: ' + str(__e))
    __sys.exit(2)
__keys = ${argsList}
__args = [__input.get(__k) for __k in __keys]
try:
    __out = ${entry.name}(*__args)
except Exception as __e:
    import traceback as __tb
    __sys.stderr.write('RuntimeError: ' + __tb.format_exc())
    __sys.exit(1)
__sys.stdout.write('<<<OUT>>>' + __json.dumps(__out) + '<<<END>>>')
`;
}

/**
 * Build the program to execute.
 *
 * Returns EITHER a string — one program reused for every test case, with the payload
 * arriving on stdin — OR a function `(testCase) => string` for languages whose harness
 * embeds the arguments as source literals.
 *
 * Java takes the second route because its inputs are tiny (largest payload across the
 * whole curriculum: 101 bytes) and literals let its harness carry a serializer but no
 * parser. It costs nothing: every provider recompiles per case anyway, since Paiza's
 * create is an independent compile and Judge0's batch carries a source per submission.
 *
 * JavaScript, Python and C++ are untouched and still return a string.
 */
function buildProgram(language, userCode, entry, cppSignature) {
  const lang = normalizeLanguage(language);
  if (lang === 'javascript') return buildJavaScriptProgram(userCode, entry);
  if (lang === 'python')     return buildPythonProgram(userCode, entry);
  if (lang === 'cpp' || lang === 'c') return buildCppProgram(userCode, cppSignature);
  if (lang === 'csharp')     return buildCsharpProgram(userCode, entry);
  if (lang === 'java') {
    // Per-case program: the arguments are literals in the source, so validate the
    // signature once here and hand back a builder the run loop calls per test case.
    // Validating eagerly means a bad signature is one clear error, not one per case.
    renderJavaStarter(cppSignature || {});
    return (testCase) => buildJavaProgram(userCode, cppSignature, testCase?.input_payload);
  }
  throw new Error(`Unsupported language: ${language}`);
}

/** Resolve a program for one test case, whichever shape buildProgram returned. */
function programFor(program, testCase) {
  return typeof program === 'function' ? program(testCase) : program;
}

function buildCsharpProgram(userCode, entry) {
  // Use a tiny JSON parser embedded in the C# harness for Judge0 Mono 6.6 compatibility
  return `
using System;
using System.Collections.Generic;
using System.Reflection;

public class TinyJson {
    public static object Parse(string s, Type t) {
        s = s.Trim();
        if (t == typeof(int)) return int.Parse(s);
        if (t == typeof(double)) return double.Parse(s);
        if (t == typeof(bool)) return s == "true";
        if (t == typeof(string)) {
            if(s.StartsWith("\\"") && s.EndsWith("\\"")) return s.Substring(1, s.Length - 2);
            return s;
        }
        if (t.IsArray) {
            var elType = t.GetElementType();
            s = s.Substring(1, s.Length - 2).Trim();
            if (s == "") return Array.CreateInstance(elType, 0);
            var parts = SplitJsonArray(s);
            var arr = Array.CreateInstance(elType, parts.Count);
            for(int i=0; i<parts.Count; i++) {
                arr.SetValue(Parse(parts[i], elType), i);
            }
            return arr;
        }
        return null;
    }
    static List<string> SplitJsonArray(string s) {
        var res = new List<string>();
        int d = 0; bool q = false; int last = 0;
        for(int i=0; i<s.Length; i++) {
            if (s[i] == '"' && (i == 0 || s[i-1] != '\\\\')) q = !q;
            else if (!q) {
                if (s[i] == '[' || s[i] == '{') d++;
                else if (s[i] == ']' || s[i] == '}') d--;
                else if (s[i] == ',' && d == 0) {
                    res.Add(s.Substring(last, i - last));
                    last = i + 1;
                }
            }
        }
        res.Add(s.Substring(last));
        return res;
    }
    public static string Stringify(object o) {
        if (o == null) return "null";
        if (o is int || o is double) return o.ToString();
        if (o is bool) return ((bool)o) ? "true" : "false";
        if (o is string) return "\\"" + o.ToString() + "\\"";
        if (o.GetType().IsArray) {
            var arr = (Array)o;
            var parts = new List<string>();
            foreach(var it in arr) parts.Add(Stringify(it));
            return "[" + string.Join(",", parts) + "]";
        }
        return o.ToString();
    }
    public static Dictionary<string, string> ParseDict(string s) {
        var d = new Dictionary<string, string>();
        s = s.Trim();
        if (s.Length < 2) return d;
        s = s.Substring(1, s.Length - 2).Trim();
        if (s == "") return d;
        var parts = SplitJsonArray(s);
        foreach(var p in parts) {
            int colon = -1; bool q = false;
            for(int i=0; i<p.Length; i++) {
                if (p[i] == '"' && (i == 0 || p[i-1] != '\\\\')) q = !q;
                else if (!q && p[i] == ':') { colon = i; break; }
            }
            if (colon != -1) {
                string k = p.Substring(0, colon).Trim();
                if(k.StartsWith("\\"") && k.EndsWith("\\"")) k = k.Substring(1, k.Length - 2);
                string v = p.Substring(colon+1).Trim();
                d[k] = v;
            }
        }
        return d;
    }
}

\${userCode}

public class Program {
    public static void Main() {
        string raw = Console.In.ReadToEnd().Trim();
        var dict = TinyJson.ParseDict(raw);
        var sol = new Solution();
        var method = typeof(Solution).GetMethod("\${entry ? entry.name : "Solve"}");
        if (method == null) {
            var methods = typeof(Solution).GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly);
            if (methods.Length > 0) method = methods[0];
        }
        if (method == null) throw new Exception("No method found");
        var parameters = method.GetParameters();
        var args = new object[parameters.Length];
        for(int i = 0; i < parameters.Length; i++) {
            var p = parameters[i];
            if (dict.ContainsKey(p.Name)) {
                args[i] = TinyJson.Parse(dict[p.Name], p.ParameterType);
            }
        }
        try {
            var result = method.Invoke(sol, args);
            Console.WriteLine("<<<OUT>>>" + TinyJson.Stringify(result) + "<<<END>>>");
        } catch (TargetInvocationException e) {
            Console.Error.WriteLine("RuntimeError: " + e.InnerException);
            Environment.Exit(1);
}
`;
}

// ---------------------------------------------------------------------------
// C++ harness — gated on per-problem cpp_signature.
//
// The signature shape (validated at the top of runExecution):
//   {
//     fn:    'maxSubArray',                   // function or method name
//     class: 'Solution' | undefined,           // how the reference solution was
//                                              // written; the harness accepts
//                                              // either shape from the user
//     args:  [{ name: 'nums', type: 'vector<int>' }, ...],
//     ret:   'int' | 'vector<int>' | ...
//   }
//
// Supported types (covers virtually every LeetCode-style problem):
//   primitives:  int, long long, double, bool, string
//   1-D vectors: vector<int>, vector<long long>, vector<double>,
//                vector<bool>, vector<string>
//   2-D vector:  vector<vector<int>>
//
// Anything else throws a clean compile-time-style error from the harness
// builder so the user sees "unsupported type 'X'" instead of cryptic
// compiler output.
// ---------------------------------------------------------------------------
/**
 * C++ type table, projected from the registry.
 *
 * Still exported because the seed-file tooling (backfill-cpp-signatures.js,
 * backfill-cpp-starters.js, lib/cpp-infer.mjs) imports it, and because a script that
 * kept its own copy could emit a type the harness would then refuse to compile.
 *
 * The extra keys here are ACCEPTED SPELLINGS, not new capabilities: hand-written
 * signatures in the seed files use `long`, `int64_t` and `float`, and they resolve to
 * the same declarations as their canonical equivalents. The registry holds only the
 * canonical vocabulary, so the aliasing belongs here, next to the code that parses
 * real signatures.
 */
const CPP_TYPE_ALIASES = Object.freeze({
  'long': 'long long',
  'int64_t': 'long long',
  'float': 'double',
  'vector<long>': 'vector<long long>',
});

export const CPP_TYPE_MAP = Object.freeze(
  Object.fromEntries([
    ...['int', 'long long', 'double', 'bool', 'string',
      'vector<int>', 'vector<long long>', 'vector<double>',
      'vector<bool>', 'vector<string>', 'vector<vector<int>>',
    ].map((t) => [t, typeDeclaration('cpp', t)]),
    ...Object.entries(CPP_TYPE_ALIASES).map(([alias, canonical]) => [alias, typeDeclaration('cpp', canonical)]),
  ]),
);

/**
 * Canonicalize a C++ type string to a CPP_TYPE_MAP key.
 *
 * Whitespace is *collapsed*, not removed. Removing it turned `long long` into
 * `longlong` and `vector<long long>` into `vector<long long>` with the space gone —
 * neither of which is a key, so both of the map's long-long entries were unreachable
 * and any problem whose data exceeded 32 bits was rejected with "unsupported
 * argument type". Nothing caught it because no seeded problem had values that large.
 */
export const normalizeCppType = normalizeType;

function validateCppSignature(sig) {
  if (!sig || typeof sig !== 'object') {
    throw new Error('C++ not supported for this problem (no cpp_signature configured).');
  }
  if (!sig.fn || typeof sig.fn !== 'string') {
    throw new Error('cpp_signature.fn (function/method name) is required.');
  }
  if (!Array.isArray(sig.args)) {
    throw new Error('cpp_signature.args must be an array.');
  }
  for (const a of sig.args) {
    if (!a || typeof a.name !== 'string' || typeof a.type !== 'string') {
      throw new Error('Each cpp_signature.args entry needs { name, type }.');
    }
    if (!CPP_TYPE_MAP[normalizeCppType(a.type)]) {
      throw new Error(`cpp_signature: unsupported argument type "${a.type}".`);
    }
  }
  if (!sig.ret || typeof sig.ret !== 'string') {
    throw new Error('cpp_signature.ret (return type) is required.');
  }
  if (!CPP_TYPE_MAP[normalizeCppType(sig.ret)]) {
    throw new Error(`cpp_signature: unsupported return type "${sig.ret}".`);
  }
}

/**
 * Build the per-call argument-decode block, e.g.
 *   vector<int> nums = decodeVecI(__input.at("nums"));
 *   int k = decodeInt(__input.at("k"));
 */
function emitCppArgDecodes(args) {
  return args.map((a) => {
    const m = CPP_TYPE_MAP[normalizeCppType(a.type)];
    return `  ${m.decl} ${a.name} = ${m.decoder}(__input.at("${a.name}"));`;
  }).join('\n');
}

/**
 * Does the submitted code actually define this class or struct?
 *
 * `cpp_signature.class` records how the reference solution was written, not what
 * the user must write. Both a LeetCode-style `class Solution { int f(...) }` and
 * a bare `int f(...)` are natural submissions, so the harness reads the shape off
 * the code instead of trusting the signature. Before this, a free-function
 * submission to a problem whose signature named a class failed with
 * `unknown type name 'Solution'`, which reads as a platform bug rather than a
 * mistake in the submission. The generated C++ starter (see
 * server/scripts/backfill-cpp-starters.js) is class-shaped, but nothing stops a
 * user deleting the wrapper, so this stays a runtime decision.
 *
 * A heuristic: it looks for a definition (`... {`), not a mere mention, so a
 * `Solution` in a comment or a `Solution*` parameter does not count. Guessing
 * wrong is no worse than the old behaviour — a compile error naming the symbol
 * that is missing.
 */
function cppDefinesClass(userCode, className) {
  const name = String(className || '').trim();
  if (!name) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b(?:class|struct)\\s+${escaped}\\b[^;{]*\\{`).test(String(userCode || ''));
}

/**
 * Emit the call expression. Two shapes:
 *   class-style:  Solution __sol; __out = __sol.fn(arg1, arg2);
 *   free-fn:      __out = fn(arg1, arg2);
 *
 * Chosen from what the submission contains, not from the signature alone.
 */
function emitCppCallExpr(sig, userCode) {
  const argList = sig.args.map((a) => a.name).join(', ');
  const declared = typeof sig.class === 'string' ? sig.class.trim() : '';
  // Default to Solution so a class-style submission still works on a problem
  // whose signature describes a free function.
  const className = declared || 'Solution';
  if (cppDefinesClass(userCode, className)) {
    return `${className} __sol; __out = __sol.${sig.fn}(${argList});`;
  }
  return `__out = ${sig.fn}(${argList});`;
}

function buildCppProgram(userCode, sig) {
  validateCppSignature(sig);
  const retInfo = CPP_TYPE_MAP[normalizeCppType(sig.ret)];
  const argDecodes = emitCppArgDecodes(sig.args);
  const callExpr = emitCppCallExpr(sig, userCode);

  // Embedded JSON parser/writer — Judge0's stock GCC image has no nlohmann/json.
  // Strict subset of JSON sufficient for whatever JSON.stringify emits on the
  // server side (numbers, strings with escapes, booleans, null, arrays, objects).
  return `// ===== robinhood C++ harness (auto-generated, do not edit) =====
#include <bits/stdc++.h>
using namespace std;

namespace MJ {
enum class Kind { Null, Bool, Number, String, Array, Object };
struct Value;
using Array  = vector<Value>;
using Object = map<string, Value>;
struct Value {
  Kind kind = Kind::Null;
  bool   b = false;
  double n = 0.0;
  string s;
  shared_ptr<Array>  arr;
  shared_ptr<Object> obj;
  static Value Null() { Value v; v.kind = Kind::Null; return v; }
  static Value Bool(bool x) { Value v; v.kind = Kind::Bool; v.b = x; return v; }
  static Value Num(double x) { Value v; v.kind = Kind::Number; v.n = x; return v; }
  static Value Str(const string& x) { Value v; v.kind = Kind::String; v.s = x; return v; }
  static Value Arr() { Value v; v.kind = Kind::Array;  v.arr = make_shared<Array>();  return v; }
  static Value Obj() { Value v; v.kind = Kind::Object; v.obj = make_shared<Object>(); return v; }
  bool   asBool()   const { return kind == Kind::Bool ? b : (kind == Kind::Number ? n != 0 : false); }
  double asNumber() const { return kind == Kind::Number ? n : 0.0; }
  const string& asString() const { static string e; return kind == Kind::String ? s : e; }
  const Array&  asArray()  const { static Array e; return (kind == Kind::Array  && arr) ? *arr : e; }
  const Object& asObject() const { static Object e; return (kind == Kind::Object && obj) ? *obj : e; }
  const Value&  at(const string& k) const {
    static Value nv;
    if (kind != Kind::Object || !obj) return nv;
    auto it = obj->find(k);
    return it == obj->end() ? nv : it->second;
  }
};

struct Parser {
  const string& src; size_t i = 0;
  Parser(const string& s) : src(s) {}
  void skip() { while (i < src.size() && isspace((unsigned char)src[i])) ++i; }
  bool match(char c) { skip(); if (i < src.size() && src[i] == c) { ++i; return true; } return false; }
  void expect(char c) { if (!match(c)) throw runtime_error(string("Expected '") + c + "'"); }
  Value parse() {
    skip();
    if (i >= src.size()) throw runtime_error("Unexpected EOF");
    char c = src[i];
    if (c == '{') return parseObject();
    if (c == '[') return parseArray();
    if (c == '"') return parseString();
    if (c == 't' || c == 'f') return parseBool();
    if (c == 'n') { if (src.compare(i, 4, "null") != 0) throw runtime_error("Bad null"); i += 4; return Value::Null(); }
    return parseNumber();
  }
  Value parseObject() {
    expect('{'); Value out = Value::Obj();
    if (match('}')) return out;
    while (true) {
      skip(); Value k = parseString(); expect(':'); Value v = parse();
      (*out.obj)[k.s] = v;
      if (match(',')) continue;
      expect('}'); break;
    }
    return out;
  }
  Value parseArray() {
    expect('['); Value out = Value::Arr();
    if (match(']')) return out;
    while (true) {
      out.arr->push_back(parse());
      if (match(',')) continue;
      expect(']'); break;
    }
    return out;
  }
  Value parseString() {
    expect('"'); string r;
    while (i < src.size() && src[i] != '"') {
      if (src[i] == '\\\\') {
        ++i;
        if (i >= src.size()) throw runtime_error("Bad escape");
        char e = src[i++];
        switch (e) {
          case '"':  r += '"';  break;
          case '\\\\': r += '\\\\'; break;
          case '/':  r += '/';  break;
          case 'n':  r += '\\n'; break;
          case 't':  r += '\\t'; break;
          case 'r':  r += '\\r'; break;
          case 'b':  r += '\\b'; break;
          case 'f':  r += '\\f'; break;
          case 'u': {
            if (i + 4 > src.size()) throw runtime_error("Bad unicode");
            unsigned cp = stoul(src.substr(i, 4), nullptr, 16); i += 4;
            if (cp < 0x80) r += (char)cp;
            else if (cp < 0x800) { r += (char)(0xC0 | (cp >> 6)); r += (char)(0x80 | (cp & 0x3F)); }
            else { r += (char)(0xE0 | (cp >> 12)); r += (char)(0x80 | ((cp >> 6) & 0x3F)); r += (char)(0x80 | (cp & 0x3F)); }
            break;
          }
          default: r += e;
        }
      } else { r += src[i++]; }
    }
    expect('"'); return Value::Str(r);
  }
  Value parseNumber() {
    size_t start = i;
    if (i < src.size() && src[i] == '-') ++i;
    while (i < src.size()) {
      char c = src[i];
      if ((c >= '0' && c <= '9') || c == '.' || c == 'e' || c == 'E' || c == '+' || c == '-') ++i;
      else break;
    }
    return Value::Num(stod(src.substr(start, i - start)));
  }
  Value parseBool() {
    if (src.compare(i, 4, "true")  == 0) { i += 4; return Value::Bool(true); }
    if (src.compare(i, 5, "false") == 0) { i += 5; return Value::Bool(false); }
    throw runtime_error("Bad bool");
  }
};

inline Value parse(const string& s) { Parser p(s); return p.parse(); }

inline string esc(const string& s) {
  // Deliberately written WITHOUT backslashes inside string literals. This file is
  // emitted from a JS template literal, so every backslash below is escaped
  // twice; a miscount here produced \`string o = """;\` and made EVERY C++
  // submission fail to compile (found and fixed 2026-08-29 by compiling the
  // generated harness on Paiza -- see server/scripts/check-paiza.js).
  // Q and BS are the ASCII codes for the only two characters that must be
  // escaped, so no escape sequence is involved in producing them at all.
  const char Q = 34, BS = 92;
  string o(1, Q);
  for (char c : s) {
    if (c == Q)          { o += BS; o += Q;   }
    else if (c == BS)    { o += BS; o += BS;  }
    else if (c == '\\n') { o += BS; o += 'n'; }
    else if (c == '\\t') { o += BS; o += 't'; }
    else if (c == '\\r') { o += BS; o += 'r'; }
    else if (c == '\\b') { o += BS; o += 'b'; }
    else if (c == '\\f') { o += BS; o += 'f'; }
    else if ((unsigned char)c < 0x20) {
      char buf[8]; snprintf(buf, sizeof(buf), "u%04x", (unsigned char)c);
      o += BS; o += buf;
    } else o += c;
  }
  o += Q; return o;
}

inline string toJson(int x)         { return to_string(x); }
inline string toJson(long x)        { return to_string(x); }
inline string toJson(long long x)   { return to_string(x); }
inline string toJson(double x) {
  if (isnan(x) || isinf(x)) return "null";
  ostringstream os; os.precision(17); os << x; return os.str();
}
inline string toJson(bool x)            { return x ? "true" : "false"; }
inline string toJson(const string& x)   { return esc(x); }
inline string toJson(const char* x)     { return esc(string(x)); }
template <typename T> string toJson(const vector<T>& v) {
  string o = "[";
  for (size_t i = 0; i < v.size(); ++i) { if (i) o += ","; o += toJson(v[i]); }
  o += "]"; return o;
}
} // namespace MJ

static int               decodeInt   (const MJ::Value& v) { return (int)v.asNumber(); }
static long long         decodeLL    (const MJ::Value& v) { return (long long)v.asNumber(); }
static double            decodeD     (const MJ::Value& v) { return (double)v.asNumber(); }
static bool              decodeBool  (const MJ::Value& v) { return v.asBool(); }
static string            decodeStr   (const MJ::Value& v) { return v.asString(); }
static vector<int>       decodeVecI  (const MJ::Value& v) { vector<int> o; for (auto& e : v.asArray()) o.push_back(decodeInt(e)); return o; }
static vector<long long> decodeVecLL (const MJ::Value& v) { vector<long long> o; for (auto& e : v.asArray()) o.push_back(decodeLL(e)); return o; }
static vector<double>    decodeVecD  (const MJ::Value& v) { vector<double> o; for (auto& e : v.asArray()) o.push_back(decodeD(e)); return o; }
static vector<bool>      decodeVecBool(const MJ::Value& v){ vector<bool> o; for (auto& e : v.asArray()) o.push_back(decodeBool(e)); return o; }
static vector<string>    decodeVecStr(const MJ::Value& v) { vector<string> o; for (auto& e : v.asArray()) o.push_back(decodeStr(e)); return o; }
static vector<vector<int>> decodeMatI(const MJ::Value& v) { vector<vector<int>> o; for (auto& e : v.asArray()) o.push_back(decodeVecI(e)); return o; }

// ===== USER CODE =====
${userCode}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  string __raw((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());
  MJ::Value __input;
  try { __input = (__raw.find_first_not_of(" \\t\\n\\r") == string::npos) ? MJ::Value::Obj() : MJ::parse(__raw); }
  catch (exception& e) {
    cerr << "Harness: failed to parse stdin JSON: " << e.what();
    return 2;
  }
${argDecodes}
  ${retInfo.decl} __out{};
  try {
    ${callExpr}
  } catch (exception& e) {
    cerr << "RuntimeError: " << e.what();
    return 1;
  }
  cout << "<<<OUT>>>" << MJ::toJson(__out) << "<<<END>>>";
  return 0;
}
`;
}

/**
 * Extract the JSON payload between our harness sentinels. If absent (the
 * harness never reached the print line), fall back to the last non-empty
 * trimmed stdout line, then parse JSON.
 */
function parseHarnessOutput(stdout) {
  if (typeof stdout !== 'string') return { ok: false, value: null };
  const m = stdout.match(/<<<OUT>>>([\s\S]*?)<<<END>>>/);
  let payload;
  if (m) {
    payload = m[1];
  } else {
    const lines = stdout.split('\n').map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) return { ok: false, value: null };
    payload = lines[lines.length - 1];
  }
  try {
    return { ok: true, value: JSON.parse(payload) };
  } catch {
    return { ok: false, value: payload };
  }
}

// ---------------------------------------------------------------------------
// Provider: Piston (https://emkc.org/api/v2/piston)
// ---------------------------------------------------------------------------
/**
 * Piston wants a language name, a version spec and a source filename — a different
 * shape from Judge0's numeric id and Paiza's slug, which is why the registry keeps
 * per-provider mappings instead of one shared id.
 */
function pistonLangConfig(language) {
  const mapping = providerMapping(language, 'piston');
  if (!mapping) return null;
  return { language: mapping.id, version: '*', filename: mapping.filename };
}

async function pistonRun({ language, program, stdin }) {
  const cfg = pistonLangConfig(language);
  if (!cfg) throw new Error(`Piston: unsupported language ${language}`);

  const body = {
    language: cfg.language,
    version:  cfg.version,
    files: [{ name: cfg.filename, content: program }],
    stdin,
    run_timeout:    PER_TEST_TIMEOUT_MS,
    compile_timeout: 10_000,
    run_memory_limit:    MEMORY_MB * 1024 * 1024,
    compile_memory_limit: MEMORY_MB * 1024 * 1024,
  };

  const res = await withTimeout(
    fetch(`${PISTON_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    HTTP_TIMEOUT_MS,
    'piston'
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Piston HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();

  // Piston shape: { run: { stdout, stderr, code, signal, output }, compile?: {...} }
  const compile = json.compile;
  const run = json.run || {};

  if (compile && compile.code !== 0 && compile.stderr) {
    return {
      stdout: run.stdout || '',
      stderr: compile.stderr,
      exitCode: compile.code,
      signal: compile.signal,
      timed_out: false,
      kind: ERROR_KIND.COMPILE_ERROR,
    };
  }

  // Piston signals SIGKILL on time limit; surface it.
  const timedOut =
    run.signal === 'SIGKILL' ||
    /time/i.test(run.stderr || '') && /limit|exceed/i.test(run.stderr || '');

  return {
    stdout: run.stdout || '',
    stderr: run.stderr || '',
    exitCode: run.code,
    signal: run.signal,
    timed_out: timedOut,
    kind: null,
  };
}

// ---------------------------------------------------------------------------
// Provider: Judge0 (CE / RapidAPI / self-hosted)
// ---------------------------------------------------------------------------
// Judge0 ids come from the registry. This table used to live here AND in
// server/execution/judge0.js with different contents — this copy had C# but no Java,
// that one had Java but no C# — so the same provider answered to two different maps
// depending on which entrypoint you came through.
//
// Note that C no longer borrows 54 (the C++ id). Running C through a C++ compiler
// made it C in name only, and Phase 2C gives it id 50 and a real C harness.

function judge0Headers() {
  const h = { 'Content-Type': 'application/json' };
  if (JUDGE0_API_KEY) {
    h['X-RapidAPI-Key']  = JUDGE0_API_KEY;
    h['X-RapidAPI-Host'] = JUDGE0_API_HOST;
  }
  return h;
}

function b64encode(s) {
  return Buffer.from(s, 'utf8').toString('base64');
}
function b64decode(s) {
  if (!s) return '';
  return Buffer.from(s, 'base64').toString('utf8');
}

// Judge0's official host does NOT enable `wait=true` (and the parameter is not
// defined for the batch endpoints at all), so results must be created and then
// polled. Batching is not just an optimisation here: it is the only shape that
// works, and it collapses one submission from 12-15 HTTP requests (the seeded
// problems average 12.1 test cases) down to roughly three, which matters against
// a metered RapidAPI quota. Per-test-case granularity is preserved because each
// test case is still its own Judge0 submission with its own status, time and
// memory -- a TLE on case 9 is still reported as a TLE on case 9.
const JUDGE0_BATCH_SIZE = Math.max(1, Number(process.env.JUDGE0_BATCH_SIZE) || 20);
const JUDGE0_POLL_INTERVAL_MS = Math.max(150, Number(process.env.JUDGE0_POLL_INTERVAL_MS) || 400);
const JUDGE0_MAX_POLLS = Math.max(1, Number(process.env.JUDGE0_MAX_POLLS) || 40);
const JUDGE0_FIELDS = 'token,stdout,stderr,compile_output,message,status,time,memory,exit_code';

// HTTP requests spent by the most recent runExecution call, across whichever
// provider ran it. Surfaced in the result so real cost is measured, not assumed.
let providerRequestCount = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strip the RapidAPI key out of any text that is about to become an error
 * message. Judge0 error bodies are surfaced to the user via `stderr`, and an
 * upstream gateway that echoes a request header back would otherwise publish
 * the key to every solver on the platform.
 */
function judge0Redact(text) {
  const s = String(text ?? '');
  return JUDGE0_API_KEY ? s.split(JUDGE0_API_KEY).join('[redacted]') : s;
}

async function judge0Fetch(url, init) {
  providerRequestCount += 1;
  const res = await withTimeout(fetch(url, init), HTTP_TIMEOUT_MS, 'judge0');
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // Status plus a redacted, truncated body only. Never include `init` or its
    // headers in an error: they carry the RapidAPI key.
    throw new Error(`Judge0 HTTP ${res.status}: ${judge0Redact(text).slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Map one finished Judge0 submission onto the exec shape the comparison layer
 * expects, identical to what pistonRun returns.
 */
function judge0MapSubmission(j) {
  // Judge0 status ids: 1 In Queue, 2 Processing, 3 Accepted, 4 Wrong Answer,
  // 5 TLE, 6 Compilation Error, 7-12 runtime errors, 13 Internal Error,
  // 14 Exec Format Error. Status 3 vs 4 is Judge0's own exact-string verdict,
  // which we ignore -- correctness is decided by deepEqual on parsed JSON.
  const statusId = j?.status?.id ?? 0;
  const stdout = b64decode(j?.stdout || '');
  const stderr = b64decode(j?.stderr || '');
  const compile = b64decode(j?.compile_output || '');
  const message = b64decode(j?.message || '');

  let kind = null;
  if (statusId === 6) kind = ERROR_KIND.COMPILE_ERROR;
  else if (statusId === 5) kind = ERROR_KIND.TIME_LIMIT_EXCEEDED;
  else if (statusId >= 7 && statusId <= 12) kind = ERROR_KIND.RUNTIME_ERROR;
  else if (statusId === 13 || statusId === 14) kind = ERROR_KIND.HARNESS_ERROR;

  return {
    stdout,
    stderr: stderr || compile || message,
    exitCode: j?.exit_code ?? null,
    signal: null,
    timed_out: statusId === 5,
    kind,
    runtime_seconds: parseFloat(j?.time) || 0,
    memory_kb: Number(j?.memory) || 0,
  };
}

/**
 * A batch POST returns 201 with a POSITIONAL array: a valid item yields
 * { token }, an invalid one yields a validation error object in that slot. So a
 * batch can be partially rejected while still returning 201 -- results must be
 * matched by index, never by assuming every slot succeeded.
 */
function describeJudge0Rejection(entry) {
  if (!entry) return 'Judge0 returned no result for this test case.';
  try {
    const parts = Object.entries(entry).map(([k, v]) => (
      `${k}: ${Array.isArray(v) ? v.join('; ') : String(v)}`
    ));
    if (parts.length === 0) return 'Judge0 rejected this submission.';
    return judge0Redact(`Judge0 rejected this submission (${parts.join(' | ')})`).slice(0, 500);
  } catch {
    return 'Judge0 rejected this submission.';
  }
}

/**
 * Execute every test case as one Judge0 batch (chunked), then poll to completion.
 * Returns an exec object per test case, in the original order.
 */
async function judge0RunBatch({ language, program, testCases }) {
  const langId = providerLanguageId(language, 'judge0');
  if (!langId) throw new Error(`Judge0: unsupported language ${language}`);

  const base = getJudge0Url().replace(/\/$/, '');
  // `source_code` is per submission in the batch API, so a per-case program (Java's
  // literal harness) costs no extra requests and no extra compiles: each submission
  // was always going to be compiled on its own.
  const sourceFor = (tc) => b64encode(programFor(program, tc));
  const cpuLimit = Math.max(1, Math.ceil(PER_TEST_TIMEOUT_MS / 1000));

  // One slot per test case: { token } once created, or { error } if rejected.
  const slots = new Array(testCases.length).fill(null);

  for (let start = 0; start < testCases.length; start += JUDGE0_BATCH_SIZE) {
    const chunk = testCases.slice(start, start + JUDGE0_BATCH_SIZE);
    const created = await judge0Fetch(`${base}/submissions/batch?base64_encoded=true`, {
      method: 'POST',
      headers: judge0Headers(),
      body: JSON.stringify({
        submissions: chunk.map((tc) => ({
          language_id: langId,
          source_code: sourceFor(tc),
          stdin: b64encode(JSON.stringify(tc.input_payload ?? {})),
          cpu_time_limit: cpuLimit,
          wall_time_limit: cpuLimit + 2,
          enable_network: false,
          redirect_stderr_to_stdout: false,
        })),
      }),
    });

    const arr = Array.isArray(created) ? created : [];
    for (let i = 0; i < chunk.length; i++) {
      const entry = arr[i];
      slots[start + i] = entry && entry.token
        ? { token: entry.token }
        : { error: describeJudge0Rejection(entry) };
    }
  }

  // ----- poll until every created submission reaches a terminal status -----
  const finished = new Map();
  const pending = new Set(slots.filter((s) => s?.token).map((s) => s.token));
  let delay = JUDGE0_POLL_INTERVAL_MS;

  for (let attempt = 0; attempt < JUDGE0_MAX_POLLS && pending.size > 0; attempt++) {
    await sleep(delay);
    delay = Math.min(Math.round(delay * 1.5), 3000);

    const got = await judge0Fetch(
      `${base}/submissions/batch?tokens=${encodeURIComponent([...pending].join(','))}`
      + `&base64_encoded=true&fields=${JUDGE0_FIELDS}`,
      { method: 'GET', headers: judge0Headers() }
    );

    for (const sub of got?.submissions || []) {
      const statusId = sub?.status?.id ?? 0;
      // 1 = In Queue, 2 = Processing. Anything else is terminal.
      if (statusId > 2 && sub.token) {
        finished.set(sub.token, sub);
        pending.delete(sub.token);
      }
    }
  }

  return slots.map((slot) => {
    if (slot?.error) {
      return {
        stdout: '', stderr: slot.error, exitCode: -1, signal: null,
        timed_out: false, kind: ERROR_KIND.HARNESS_ERROR,
      };
    }
    const sub = finished.get(slot.token);
    if (!sub) {
      // Still queued when the poll budget ran out. Report it as a timeout
      // rather than silently treating an unfinished run as a wrong answer.
      return {
        stdout: '',
        stderr: 'Judge0 did not return a result within the poll budget.',
        exitCode: -1, signal: null,
        timed_out: true, kind: ERROR_KIND.TIME_LIMIT_EXCEEDED,
      };
    }
    return judge0MapSubmission(sub);
  });
}

/**
 * Judge0 entry point used by runExecution. Returns the same
 * { idx, tc, exec, elapsed } records the per-case path produces, so all the
 * comparison and redaction logic downstream is shared.
 */
async function judge0Collect({ language, program, testCases }) {
  let execs;
  try {
    execs = await judge0RunBatch({ language, program, testCases });
  } catch (e) {
    // A transport-level failure (auth, quota, outage) has no per-case detail,
    // so attribute the same error to every case instead of throwing a 500.
    const msg = String((e && e.message) || e);
    const timedOut = /timed out/i.test(msg);
    execs = testCases.map(() => ({
      stdout: '', stderr: msg, exitCode: -1, signal: null,
      timed_out: timedOut,
      kind: timedOut ? ERROR_KIND.TIME_LIMIT_EXCEEDED : ERROR_KIND.HARNESS_ERROR,
    }));
  }

  return testCases.map((tc, idx) => ({
    idx,
    tc,
    exec: execs[idx],
    // Judge0 reports actual CPU time, which beats measuring our own wall clock.
    elapsed: Math.round((Number(execs[idx]?.runtime_seconds) || 0) * 1000),
  }));
}

// ---------------------------------------------------------------------------
// Provider: Paiza.IO (https://api.paiza.io)
// ---------------------------------------------------------------------------
// The free option that actually works, and the reason this platform can grade
// real submissions without a paid plan. Verified live on 2026-08-29 with
// api_key=guest -- no signup, no card, no quota to top up. All six languages the
// problem UI offers ran a stdin sum correctly:
//
//     c       Clang 14, C17         csharp      Mono
//     cpp     Clang 18, C++20       java        18
//     python  3.11.13               javascript  Node 16.17.1
//
// Those runtimes are NEWER than Judge0 CE 1.13.x (Node 12.14.0, Python 3.8.1),
// so `?.`, `??` and `match` work here and would be compile errors on Judge0.
//
// Three measured constraints, not assumptions:
//
//  1. THE CPU LIMIT IS 1.00 SECOND and is not configurable on the guest key.
//     ~0.35s of work succeeds; ~2s comes back result:"timeout" with time:"1.00".
//     EXECUTION_TIMEOUT_MS cannot raise it. A correct but slow solution WILL be
//     reported as Time Limit Exceeded, which is the main functional difference
//     from Judge0 (where cpu_time_limit is ours to set).
//  2. There is no batch endpoint, and `longpoll=true` is ignored -- create
//     returns status:"running" immediately. So each test case costs its own
//     create plus polls (~2 requests). Requests are free, so this is latency,
//     not quota: 12 concurrent creates were accepted in about 1 second with no
//     throttling.
//  3. `memory` is reported in BYTES here (a Python hello-world is ~8_368_000),
//     where Judge0 reports kilobytes.
//
// Risk worth stating plainly: this is an undocumented free endpoint with no
// published rate limit and no terms covering production use. The public Piston
// API closed to the public on 2026-02-15 with no notice. Assume this one can do
// the same, which is exactly why `judge0` is kept working alongside it.
// Read lazily, matching getJudge0Url(): a module-load constant cannot be pointed
// at a fake server on an ephemeral port, and fixed ports make tests flaky.
function getPaizaUrl() {
  return String(process.env.PAIZA_URL || 'https://api.paiza.io').replace(/\/$/, '');
}
function getPaizaKey() {
  return process.env.PAIZA_API_KEY || 'guest';
}
const PAIZA_POLL_INTERVAL_MS = Math.max(150, Number(process.env.PAIZA_POLL_INTERVAL_MS) || 500);
const PAIZA_MAX_POLLS = Math.max(1, Number(process.env.PAIZA_MAX_POLLS) || 20);

// Paiza slugs come from the registry. Paiza accepts all six languages; whether the
// engine can build a program for one is `harnessImplemented`, which is the gate.

// 'guest' is not a credential, but a real key would be, and Paiza takes it as a
// request parameter rather than a header -- so keep it out of error text.
function paizaRedact(text) {
  const s = String(text ?? '');
  const key = getPaizaKey();
  return key && key !== 'guest' ? s.split(key).join('[redacted]') : s;
}

async function paizaFetch(path, params, method = 'POST') {
  providerRequestCount += 1;
  const form = new URLSearchParams({ ...params, api_key: getPaizaKey() });
  const init = method === 'GET'
    ? { method: 'GET' }
    : {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    };
  const base = getPaizaUrl();
  const url = method === 'GET' ? `${base}${path}?${form}` : `${base}${path}`;

  const res = await withTimeout(fetch(url, init), HTTP_TIMEOUT_MS, 'paiza');
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Paiza HTTP ${res.status}: ${paizaRedact(text).slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Map a finished Paiza run onto the same exec shape pistonRun and
 * judge0MapSubmission produce, so the comparison layer is provider-agnostic.
 *
 * Field semantics, each verified against the live API on 2026-08-29:
 *
 *   compile error : build_result "failure", build_stderr set, result null
 *   runtime error : result "failure",  exit_code "1",   stderr set
 *   timeout       : result "timeout",  exit_code null,  time "1.00"
 *   success       : result "success",  exit_code "0",   time + memory set
 *
 * A run that succeeds but writes to stderr stays a success -- verified, so a
 * warning on stderr does not fail an otherwise correct solution.
 */
function paizaMapDetails(d) {
  const buildFailed = d?.build_result === 'failure';
  const timedOut = d?.result === 'timeout';

  let kind = null;
  if (buildFailed) kind = ERROR_KIND.COMPILE_ERROR;
  else if (timedOut) kind = ERROR_KIND.TIME_LIMIT_EXCEEDED;
  else if (d?.result === 'failure') kind = ERROR_KIND.RUNTIME_ERROR;

  const exitRaw = buildFailed ? d?.build_exit_code : d?.exit_code;

  return {
    stdout: d?.stdout || '',
    stderr: buildFailed ? (d?.build_stderr || '') : (d?.stderr || ''),
    exitCode: exitRaw === null || exitRaw === undefined ? null : Number(exitRaw),
    signal: null,
    timed_out: timedOut,
    kind,
    runtime_seconds: parseFloat(d?.time) || 0,
    memory_kb: Math.round((Number(d?.memory) || 0) / 1024),
  };
}

async function paizaRun({ language, program, stdin }) {
  const lang = providerLanguageId(language, 'paiza');
  if (!lang) throw new Error(`Paiza: unsupported language ${language}`);

  const created = await paizaFetch('/runners/create', {
    source_code: program,
    language: lang,
    input: stdin ?? '',
  });

  const id = created && created.id;
  if (!id) {
    throw new Error(
      `Paiza returned no run id: ${paizaRedact(JSON.stringify(created)).slice(0, 200)}`,
    );
  }

  let delay = PAIZA_POLL_INTERVAL_MS;
  for (let attempt = 0; attempt < PAIZA_MAX_POLLS; attempt++) {
    await sleep(delay);
    delay = Math.min(Math.round(delay * 1.4), 2000);
    // get_details carries its own `status`, so poll it directly instead of
    // get_status first -- 2 requests per test case rather than 3.
    const details = await paizaFetch('/runners/get_details', { id }, 'GET');
    if (details && details.status !== 'running') return paizaMapDetails(details);
  }

  return {
    stdout: '',
    stderr: 'Paiza did not return a result within the poll budget.',
    exitCode: -1,
    signal: null,
    timed_out: true,
    kind: ERROR_KIND.TIME_LIMIT_EXCEEDED,
  };
}

// ---------------------------------------------------------------------------
// Provider: Mock (delegates to ./execution-mock.js)
// ---------------------------------------------------------------------------
function mockProviderResults({ language, code, testCases }) {
  // Returns the EXACT same shape as runMockExecution.
  return runMockExecution({ language, code, testCases });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * @param {Object}  args
 * @param {string}  args.code
 * @param {string}  args.language
 * @param {Array<{
 *    id: string,
 *    input_payload: any,
 *    expected_output: any,
 *    is_hidden?: boolean,
 *    order_index?: number,
 *  }>} args.testCases
 *
 * @returns Promise<{
 *    pass_count: number,
 *    total: number,
 *    runtime_ms: number,
 *    memory_bytes: number,
 *    results: Array<{
 *       test_index: number,
 *       test_case_id: string,
 *       passed: boolean,
 *       runtime_ms: number,
 *       is_hidden: boolean,
 *       input: any,
 *       expected: any,
 *       actual: any,
 *       error_kind: string | null,
 *       stderr?: string,
 *    }>,
 *    first_failed_index: number | null,
 *    language: string,
 *    provider: string,
 *  }>
 */
export async function runExecution({ code, language, testCases, cpp_signature = null }) {
  const lang = normalizeLanguage(language);
  if (!isLanguageSupported(lang)) {
    throw new Error(`Unsupported language: ${language}`);
  }
  if (!Array.isArray(testCases) || testCases.length === 0) {
    throw new Error('testCases must be a non-empty array');
  }

  // ----- mock fallback (offline / CI) -----
  if (getProvider() === 'mock') {
    const mock = mockProviderResults({ language: lang, code, testCases });
    return {
      ...mock,
      results: mock.results.map((r) => ({ ...r, error_kind: r.passed ? null : ERROR_KIND.WRONG_ANSWER })),
      provider: 'mock',
    };
  }

  // ----- shared: parse user code once, build program once per call -----
  let entry = null;

  // Which languages skip the JS/Python entrypoint extractor is a registry fact, not
  // a hardcoded name. It used to read `if (lang === 'cpp')`, which is why C, C# and
  // Java all died with "Unsupported language for entrypoint extraction" — they take
  // their shape from a signature and have no source to parse for parameter names.
  const languageDef = getLanguage(lang);
  if (languageDef?.signatureStrategy === 'signature') {
    if (!cpp_signature) {
      return buildAllFailedResult({
        testCases,
        language: lang,
        kind: ERROR_KIND.COMPILE_ERROR,
        reason: `${languageDef.displayName} not supported for this problem (no signature configured).`,
      });
    }
  } else {
    try {
      entry = extractEntrypoint(code, lang);
    } catch (e) {
      // Treat as a compile-style error against every case so the user gets
      // a single clear message instead of a generic 500.
      return buildAllFailedResult({
        testCases,
        language: lang,
        kind: ERROR_KIND.COMPILE_ERROR,
        reason: e.message,
      });
    }
  }

  let program;
  try {
    program = buildProgram(lang, code, entry, cpp_signature);
  } catch (e) {
    // C++ signature validation errors land here.
    return buildAllFailedResult({
      testCases,
      language: lang,
      kind: ERROR_KIND.COMPILE_ERROR,
      reason: e.message,
    });
  }

  const provider = getProvider();

  // ----- test execution -----
  // Judge0 runs every case as one batch (it has no synchronous mode); other
  // providers run per case with bounded concurrency. Both produce the same
  // { idx, tc, exec, elapsed } records, so everything below is shared.
  providerRequestCount = 0;
  const startedAt = Date.now();

  // Paiza has no batch endpoint either, so it goes down the per-case path with
  // its own runner rather than Piston's.
  const runOne = provider === 'paiza' ? paizaRun : pistonRun;

  const raw = provider === 'judge0'
    ? await judge0Collect({ language: lang, program, testCases })
    : await runWithConcurrency(testCases, CONCURRENCY, async (tc, idx) => {
      const stdin = JSON.stringify(tc.input_payload ?? {});
      const t0 = Date.now();
      try {
        const exec = await runOne({ language: lang, program: programFor(program, tc), stdin });
        const elapsed = Date.now() - t0;
        return { idx, tc, exec, elapsed };
      } catch (e) {
        return {
          idx, tc,
          exec: {
            stdout: '',
            stderr: String((e && e.message) || e),
            exitCode: -1,
            signal: null,
            timed_out: /timed out/i.test(String(e && e.message)),
            kind: /timed out/i.test(String(e && e.message))
              ? ERROR_KIND.TIME_LIMIT_EXCEEDED
              : ERROR_KIND.HARNESS_ERROR,
          },
          elapsed: Date.now() - t0,
        };
      }
    });

  const totalRuntimeMs = Date.now() - startedAt;

  // ----- compare each result against expected_output -----
  const results = raw.map((entry) => {
    const { idx, tc, exec, elapsed } = entry;
    const isHidden = !!tc.is_hidden;

    // Respect a fatal timed-out / runtime error first.
    if (exec.kind && exec.kind !== ERROR_KIND.WRONG_ANSWER) {
      return {
        test_index: idx,
        test_case_id: tc.id,
        passed: false,
        runtime_ms: elapsed,
        is_hidden: isHidden,
        input: tc.input_payload,
        expected: tc.expected_output,
        actual: null,
        error_kind: exec.kind,
        stderr: trim(exec.stderr, 1500),
      };
    }

    // Otherwise we expect a parsed JSON value from harness sentinels.
    const parsed = parseHarnessOutput(exec.stdout);
    const actual = parsed.value;
    const equal = parsed.ok && deepEqual(actual, tc.expected_output);

    let kind = null;
    if (!equal) {
      kind = parsed.ok ? ERROR_KIND.WRONG_ANSWER : ERROR_KIND.RUNTIME_ERROR;
    }

    return {
      test_index: idx,
      test_case_id: tc.id,
      passed: equal,
      runtime_ms: elapsed,
      is_hidden: isHidden,
      input: tc.input_payload,
      expected: tc.expected_output,
      actual,
      error_kind: kind,
      stderr: equal ? undefined : trim(exec.stderr, 1500),
    };
  });

  // Sort by original test_index so the controller can iterate in order.
  results.sort((a, b) => a.test_index - b.test_index);

  const passCount = results.filter((r) => r.passed).length;
  const firstFailedIndex = results.findIndex((r) => !r.passed);

  // Memory: the providers don't always return memory; sum what we have, else 0.
  const memoryBytes = raw.reduce((acc, r) => {
    const kb = Number(r?.exec?.memory_kb) || 0;
    return Math.max(acc, kb * 1024);
  }, 0);

  return {
    pass_count: passCount,
    total: testCases.length,
    runtime_ms: totalRuntimeMs,
    memory_bytes: memoryBytes,
    results,
    first_failed_index: firstFailedIndex === -1 ? null : firstFailedIndex,
    language: lang,
    provider,
    // Measured, not assumed: lets us see the real quota cost of one submission.
    http_requests: provider === 'judge0' || provider === 'paiza'
      ? providerRequestCount
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function trim(s, max) {
  if (!s) return '';
  const str = String(s);
  return str.length > max ? str.slice(0, max) + '…[truncated]' : str;
}

/**
 * Build a result where every test case is marked failed with the given
 * error kind. Used when the user code can't even be parsed (compile error
 * style) so we don't try to call the executor at all.
 */
function buildAllFailedResult({ testCases, language, kind, reason }) {
  const results = testCases.map((tc, idx) => ({
    test_index: idx,
    test_case_id: tc.id,
    passed: false,
    runtime_ms: 0,
    is_hidden: !!tc.is_hidden,
    input: tc.input_payload,
    expected: tc.expected_output,
    actual: null,
    error_kind: kind,
    stderr: reason,
  }));
  return {
    pass_count: 0,
    total: testCases.length,
    runtime_ms: 0,
    memory_bytes: 0,
    results,
    first_failed_index: 0,
    language,
    provider: getProvider(),
  };
}
