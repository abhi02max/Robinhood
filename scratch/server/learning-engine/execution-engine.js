/**
 * Real code execution engine for the learning platform.
 *
 *   POST /api/learning/submit  →  service  →  runExecution(...)
 *
 * Pluggable backends (selected at runtime via EXECUTION_PROVIDER env var):
 *
 *     "piston"  (default) — https://emkc.org/api/v2/piston   (no auth, free)
 *     "judge0"            — https://judge0-ce.p.rapidapi.com (auth via RapidAPI
 *                            or self-hosted)
 *     "mock"              — falls back to ./execution-mock.js (offline / CI)
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

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
function getProvider() {
  return (process.env.EXECUTION_PROVIDER || 'piston').toLowerCase();
}

function getJudge0Url() {
  return process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com';
}

const PISTON_URL = process.env.PISTON_URL || 'https://emkc.org/api/v2/piston';

const JUDGE0_API_KEY  = process.env.JUDGE0_API_KEY  || '';
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';

const PER_TEST_TIMEOUT_MS = Number(process.env.EXECUTION_TIMEOUT_MS) || 5_000;
const HTTP_TIMEOUT_MS     = PER_TEST_TIMEOUT_MS + 4_000;
const CONCURRENCY         = Math.max(1, Number(process.env.EXECUTION_CONCURRENCY) || 4);
const MEMORY_MB           = Number(process.env.EXECUTION_MEMORY_MB) || 256;

const SUPPORTED_LANGUAGES = new Set(['javascript', 'python', 'cpp', 'c', 'csharp']);

/**
 * Normalize loose user-supplied language strings ("C++", "c++", "javascript")
 * to the canonical lowercase keys this module uses internally.
 */
function normalizeLanguage(language) {
  const v = String(language || '').toLowerCase().trim();
  if (v === 'c++') return 'cpp';
  if (v === 'c#') return 'csharp';
  return v;
}

export function isLanguageSupported(language) {
  return SUPPORTED_LANGUAGES.has(normalizeLanguage(language));
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

function buildProgram(language, userCode, entry, cppSignature) {
  const lang = normalizeLanguage(language);
  if (lang === 'javascript') return buildJavaScriptProgram(userCode, entry);
  if (lang === 'python')     return buildPythonProgram(userCode, entry);
  if (lang === 'cpp' || lang === 'c') return buildCppProgram(userCode, cppSignature);
  if (lang === 'csharp')     return buildCsharpProgram(userCode, entry);
  throw new Error(`Unsupported language: ${language}`);
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
//     class: 'Solution' | undefined,           // optional LeetCode-style class
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
const CPP_TYPE_MAP = Object.freeze({
  'int':                  { decl: 'int',                 decoder: 'decodeInt'     },
  'long':                 { decl: 'long long',           decoder: 'decodeLL'      },
  'long long':            { decl: 'long long',           decoder: 'decodeLL'      },
  'int64_t':              { decl: 'long long',           decoder: 'decodeLL'      },
  'double':               { decl: 'double',              decoder: 'decodeD'       },
  'float':                { decl: 'double',              decoder: 'decodeD'       },
  'bool':                 { decl: 'bool',                decoder: 'decodeBool'    },
  'string':               { decl: 'string',              decoder: 'decodeStr'     },
  'vector<int>':          { decl: 'vector<int>',         decoder: 'decodeVecI'    },
  'vector<long>':         { decl: 'vector<long long>',   decoder: 'decodeVecLL'   },
  'vector<long long>':    { decl: 'vector<long long>',   decoder: 'decodeVecLL'   },
  'vector<double>':       { decl: 'vector<double>',      decoder: 'decodeVecD'    },
  'vector<bool>':         { decl: 'vector<bool>',        decoder: 'decodeVecBool' },
  'vector<string>':       { decl: 'vector<string>',      decoder: 'decodeVecStr'  },
  'vector<vector<int>>':  { decl: 'vector<vector<int>>', decoder: 'decodeMatI'    },
});

function normalizeCppType(t) {
  return String(t || '').replace(/\s+/g, '').replace(/>>/g, '> >').replace(/> >/g, '>>').trim();
}

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
 * Emit the call expression. Two shapes:
 *   class-style:  Solution __sol; auto __out = __sol.fn(arg1, arg2);
 *   free-fn:      auto __out = fn(arg1, arg2);
 */
function emitCppCallExpr(sig) {
  const argList = sig.args.map((a) => a.name).join(', ');
  if (sig.class && typeof sig.class === 'string' && sig.class.trim()) {
    return `${sig.class.trim()} __sol; __out = __sol.${sig.fn}(${argList});`;
  }
  return `__out = ${sig.fn}(${argList});`;
}

function buildCppProgram(userCode, sig) {
  validateCppSignature(sig);
  const retInfo = CPP_TYPE_MAP[normalizeCppType(sig.ret)];
  const argDecodes = emitCppArgDecodes(sig.args);
  const callExpr = emitCppCallExpr(sig);

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
  string o = "\"";
  for (char c : s) {
    switch (c) {
      case '"':  o += "\\\\\""; break;
      case '\\\\': o += "\\\\\\\\"; break;
      case '\\n': o += "\\\\n"; break;
      case '\\t': o += "\\\\t"; break;
      case '\\r': o += "\\\\r"; break;
      case '\\b': o += "\\\\b"; break;
      case '\\f': o += "\\\\f"; break;
      default:
        if ((unsigned char)c < 0x20) { char buf[8]; snprintf(buf, sizeof(buf), "\\\\u%04x", (unsigned char)c); o += buf; }
        else o += c;
    }
  }
  o += '"'; return o;
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
const PISTON_LANG = {
  javascript: { language: 'javascript', version: '*', filename: 'main.js' },
  python:     { language: 'python',     version: '*', filename: 'main.py' },
  cpp:        { language: 'c++',        version: '*', filename: 'main.cpp' },
};

async function pistonRun({ language, program, stdin }) {
  const cfg = PISTON_LANG[language];
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
const JUDGE0_LANG_ID = {
  // Stable IDs for Judge0 1.13.x / RapidAPI CE
  javascript: 63,   // Node.js (12.14.0)
  python:     71,   // Python (3.8.1)
  cpp:        54,   // C++ (GCC 9.2.0) — compiled with -std=c++17 by default
  c:          54,   // Run C as C++ (GCC 9.2.0) to use our C++ harness!
  csharp:     51,   // C# (Mono 6.6.0.161)
};

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

async function judge0Run({ language, program, stdin }) {
  const langId = JUDGE0_LANG_ID[language];
  if (!langId) throw new Error(`Judge0: unsupported language ${language}`);

  // Use the synchronous /submissions endpoint with wait=true and base64
  // encoding to avoid newline / shell-escape issues.
  const url = `${getJudge0Url()}/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,compile_output,status,time,memory,exit_code`;
  const body = {
    source_code:    b64encode(program),
    language_id:    langId,
    stdin:          b64encode(stdin || ''),
    cpu_time_limit: Math.max(1, Math.ceil(PER_TEST_TIMEOUT_MS / 1000)),
    wall_time_limit: Math.max(2, Math.ceil(PER_TEST_TIMEOUT_MS / 1000) + 2),
    enable_network: false,
    redirect_stderr_to_stdout: false,
  };

  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: judge0Headers(),
      body: JSON.stringify(body),
    }),
    HTTP_TIMEOUT_MS,
    'judge0'
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Judge0 HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const j = await res.json();
  // Judge0 status descriptions (id 1..14 reserved; id=3 means Accepted).
  const statusId = j.status?.id ?? 0;
  const stdout = b64decode(j.stdout || '');
  const stderr = b64decode(j.stderr || '');
  const compile = b64decode(j.compile_output || '');

  let kind = null;
  if (statusId === 6)             kind = ERROR_KIND.COMPILE_ERROR;       // Compilation Error
  else if (statusId === 5)        kind = ERROR_KIND.TIME_LIMIT_EXCEEDED; // TLE
  else if (statusId >= 7 && statusId <= 12) kind = ERROR_KIND.RUNTIME_ERROR;

  return {
    stdout,
    stderr: stderr || compile,
    exitCode: j.exit_code,
    signal: null,
    timed_out: statusId === 5,
    kind,
    runtime_seconds: parseFloat(j.time) || 0,
    memory_kb: Number(j.memory) || 0,
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

  if (lang === 'cpp') {
    // C++ does not use the JS/Python entrypoint extractor — the harness
    // takes its function/method shape entirely from cpp_signature.
    if (!cpp_signature) {
      return buildAllFailedResult({
        testCases,
        language: lang,
        kind: ERROR_KIND.COMPILE_ERROR,
        reason: 'C++ not supported for this problem (no cpp_signature configured).',
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

  const runOne = getProvider() === 'judge0' ? judge0Run : pistonRun;

  // ----- parallel test execution with bounded concurrency -----
  const startedAt = Date.now();
  const raw = await runWithConcurrency(testCases, CONCURRENCY, async (tc, idx) => {
    const stdin = JSON.stringify(tc.input_payload ?? {});
    const t0 = Date.now();
    try {
      const exec = await runOne({ language: lang, program, stdin });
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
    provider: getProvider(),
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
