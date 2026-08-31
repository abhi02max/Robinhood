/**
 * C# pipeline: starter generation and harness generation.
 *
 * REPLACES THE OLD buildCsharpProgram, WHICH COULD NEVER HAVE WORKED
 * -----------------------------------------------------------------
 * 116 lines of dead code sat in execution-engine.js built on the wrong model. It took
 * the `entry` produced by the JavaScript/Python source parser — which is exactly why
 * it was unreachable, since only `cpp` skipped that parser — then used
 * System.Reflection and a hand-rolled TinyJson to decode stdin. It also called
 * `int.Parse` and `double.Parse` with no CultureInfo, so on a comma-decimal locale it
 * would have mis-parsed every float. None of it was salvageable.
 *
 * This follows Java and C: arguments are baked in as source literals (the largest
 * payload in the whole curriculum is 101 bytes), so there is no parser at all — only
 * output serialization.
 *
 * FOUR C#-SPECIFIC HAZARDS, ALL HANDLED HERE
 * ------------------------------------------
 * 1. **Jagged array literals are not Java's.** `new int[][]{{1,2}}` is valid Java and
 *    invalid C#; C# needs `new int[][] { new int[] { 1, 2 } }`. Copying the Java
 *    renderer would produce code that does not compile.
 * 2. **`bool.ToString()` returns "True"**, capitalised, which is not valid JSON. The
 *    serializer emits lowercase explicitly.
 * 3. **`double.ToString()` is culture-dependent.** On a comma-decimal locale 12.75
 *    formats as "12,75", which is invalid JSON and would fail every float problem for
 *    a reason nobody would look for. Every numeric format here pins
 *    CultureInfo.InvariantCulture.
 * 4. **Method names are PascalCase in C#.** LeetCode's C# signatures use `Rob`, not
 *    `rob`, and a C# candidate expects that. The canonical signature stores the
 *    camelCase name, so it is capitalised for this language only — the starter shows
 *    the real name, and the harness calls what the starter declares.
 *
 * LANGUAGE LEVEL
 * --------------
 * Targets C# 5-era syntax against Mono 6.6 (what Judge0 CE 1.13.x ships). No
 * System.Text.Json, no string interpolation, no expression-bodied members, no
 * pattern matching. StringBuilder and explicit loops only.
 */
import { normalizeType, typeDeclaration } from './registry.js';

const MAX_LITERAL_BYTES = 24_000;

/**
 * The harness class name.
 *
 * Deliberately unlikely to collide: C# allows several public top-level classes in one
 * file (unlike Java), so the user's class needs no rewriting — but two `Main` methods
 * is a compile error, so the harness must not take a name a user might reach for.
 */
const HARNESS_CLASS = '__RobinhoodHarness';

/** C# method names are PascalCase. Idempotent for a name that already is. */
export function csharpMethodName(fn) {
  const name = String(fn || '');
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

function csDecl(type, what) {
  const mapping = typeDeclaration('csharp', type);
  if (!mapping) throw new Error(`${what}: C# cannot express the type "${normalizeType(type)}"`);
  return mapping.decl;
}

function solutionClassName(sig) {
  const declared = typeof sig.class === 'string' ? sig.class.trim() : '';
  return declared || 'Solution';
}

// ---------------------------------------------------------------------------
// Literals
// ---------------------------------------------------------------------------

/** Escape a string for embedding in C# source. Non-ASCII becomes \\uXXXX. */
export function csharpStringLiteral(value) {
  let out = '"';
  const s = String(value);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const code = s.charCodeAt(i);
    if (ch === '\\') out += '\\\\';
    else if (ch === '"') out += '\\"';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (code < 0x20 || code > 0x7e) out += `\\u${code.toString(16).padStart(4, '0')}`;
    else out += ch;
  }
  return `${out}"`;
}

function scalarLiteral(type, value, what) {
  const t = normalizeType(type);
  if (t === 'int') {
    if (!Number.isInteger(value)) throw new Error(`${what}: expected an integer, got ${JSON.stringify(value)}`);
    return String(value);
  }
  if (t === 'long long') {
    if (!Number.isInteger(value)) throw new Error(`${what}: expected an integer, got ${JSON.stringify(value)}`);
    return `${value}L`;
  }
  if (t === 'double') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${what}: expected a finite number, got ${JSON.stringify(value)}`);
    }
    const text = String(value);
    // The D suffix pins the literal as a double and, with a decimal point, keeps it
    // unambiguous regardless of how the compiler would otherwise type it.
    return /[.eE]/.test(text) ? `${text}D` : `${text}.0D`;
  }
  if (t === 'bool') {
    if (typeof value !== 'boolean') throw new Error(`${what}: expected a boolean, got ${JSON.stringify(value)}`);
    return value ? 'true' : 'false';
  }
  if (t === 'string') {
    if (typeof value !== 'string') throw new Error(`${what}: expected a string, got ${JSON.stringify(value)}`);
    return csharpStringLiteral(value);
  }
  throw new Error(`${what}: C# cannot express the type "${t}"`);
}

function elementType(type) {
  const m = normalizeType(type).match(/^vector<(.+)>$/);
  if (!m) return null;
  return m[1];
}

/**
 * Render one JSON value as a C# literal.
 *
 * The jagged-array branch is the one that differs materially from Java: each row needs
 * its own `new int[] { ... }`, because a C# `int[][]` is an array OF arrays rather than
 * a rectangular block.
 */
export function csharpLiteral(type, value, what = 'value') {
  const t = normalizeType(type);

  if (t === 'vector<vector<int>>') {
    if (!Array.isArray(value)) throw new Error(`${what}: expected an array, got ${JSON.stringify(value)}`);
    if (value.length === 0) return 'new int[][] { }';
    const rows = value.map((row, i) => {
      if (!Array.isArray(row)) throw new Error(`${what}[${i}]: expected an array, got ${JSON.stringify(row)}`);
      const items = row.map((v, j) => scalarLiteral('int', v, `${what}[${i}][${j}]`));
      return `new int[] { ${items.join(', ')} }`;
    });
    return `new int[][] { ${rows.join(', ')} }`;
  }

  const elem = elementType(t);
  if (elem) {
    if (!Array.isArray(value)) throw new Error(`${what}: expected an array, got ${JSON.stringify(value)}`);
    const decl = csDecl(elem, what);
    const items = value.map((v, i) => scalarLiteral(elem, v, `${what}[${i}]`));
    return `new ${decl}[] { ${items.join(', ')} }`;
  }

  return scalarLiteral(t, value, what);
}

// ---------------------------------------------------------------------------
// Output serialization
// ---------------------------------------------------------------------------

const SERIALIZERS = `
    static string Esc(string s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder("\\"");
        for (int i = 0; i < s.Length; i++) {
            char c = s[i];
            if (c == '\\\\') b.Append("\\\\\\\\");
            else if (c == '"') b.Append("\\\\\\"");
            else if (c == '\\n') b.Append("\\\\n");
            else if (c == '\\r') b.Append("\\\\r");
            else if (c == '\\t') b.Append("\\\\t");
            else if (c < 0x20) b.Append("\\\\u").Append(((int) c).ToString("x4", CultureInfo.InvariantCulture));
            else b.Append(c);
        }
        return b.Append('"').ToString();
    }
    static string Ser(int v) { return v.ToString(CultureInfo.InvariantCulture); }
    static string Ser(long v) { return v.ToString(CultureInfo.InvariantCulture); }
    // bool.ToString() gives "True"; JSON needs "true".
    static string Ser(bool v) { return v ? "true" : "false"; }
    static string Ser(double v) {
        if (Double.IsNaN(v) || Double.IsInfinity(v)) {
            throw new Exception("result is not a finite number: " + v.ToString("R", CultureInfo.InvariantCulture));
        }
        // "R" round-trips, and InvariantCulture keeps the separator a dot on every
        // machine. Without it a comma locale emits 12,75 and the JSON is invalid.
        return v.ToString("R", CultureInfo.InvariantCulture);
    }
    static string Ser(string v) { return Esc(v); }
    static string Ser(int[] a) {
        if (a == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < a.Length; i++) { if (i > 0) b.Append(','); b.Append(Ser(a[i])); }
        return b.Append(']').ToString();
    }
    static string Ser(long[] a) {
        if (a == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < a.Length; i++) { if (i > 0) b.Append(','); b.Append(Ser(a[i])); }
        return b.Append(']').ToString();
    }
    static string Ser(double[] a) {
        if (a == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < a.Length; i++) { if (i > 0) b.Append(','); b.Append(Ser(a[i])); }
        return b.Append(']').ToString();
    }
    static string Ser(bool[] a) {
        if (a == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < a.Length; i++) { if (i > 0) b.Append(','); b.Append(Ser(a[i])); }
        return b.Append(']').ToString();
    }
    static string Ser(string[] a) {
        if (a == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < a.Length; i++) { if (i > 0) b.Append(','); b.Append(Esc(a[i])); }
        return b.Append(']').ToString();
    }
    static string Ser(int[][] a) {
        if (a == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < a.Length; i++) { if (i > 0) b.Append(','); b.Append(Ser(a[i])); }
        return b.Append(']').ToString();
    }`;

// ---------------------------------------------------------------------------
// Starter
// ---------------------------------------------------------------------------

/**
 * The C# starter shown in the editor.
 *
 * No Main, no I/O, no using directives beyond what a solution might want. A
 * non-void method with no return statement does not compile, so the body returns a
 * placeholder — an untouched starter must compile.
 */
export function renderCsharpStarter(sig) {
  const problems = [];
  let retDecl = null;
  try {
    retDecl = csDecl(sig.ret, 'return type');
  } catch (e) {
    problems.push(e.message);
  }

  const params = [];
  for (const arg of sig.args || []) {
    try {
      params.push(`${csDecl(arg.type, `argument "${arg.name}"`)} ${arg.name}`);
    } catch (e) {
      problems.push(e.message);
    }
  }
  if (!sig.fn) problems.push('signature has no function name');
  if (problems.length) return { error: problems.join('; ') };

  const method = csharpMethodName(sig.fn);
  return {
    code: [
      `public class ${solutionClassName(sig)} {`,
      `    public ${retDecl} ${method}(${params.join(', ')}) {`,
      '        // Write your solution here.',
      `        return ${zeroValueFor(sig.ret)};`,
      '    }',
      '}',
      '',
    ].join('\n'),
    summary: `${retDecl} ${method}(${params.join(', ')})`,
  };
}

function zeroValueFor(type) {
  switch (normalizeType(type)) {
    case 'int':       return '0';
    case 'long long': return '0L';
    case 'double':    return '0.0D';
    case 'bool':      return 'false';
    case 'string':    return '""';
    default:          return 'null';
  }
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/** Build a complete, self-contained C# program for ONE test case. */
export function buildCsharpProgram(userCode, sig, inputPayload) {
  if (!sig || typeof sig !== 'object') {
    throw new Error('C# not supported for this problem (no signature configured).');
  }
  if (!sig.fn) throw new Error('signature.fn (method name) is required.');
  if (!Array.isArray(sig.args)) throw new Error('signature.args must be an array.');

  const retDecl = csDecl(sig.ret, 'return type');
  const payload = inputPayload || {};

  const declarations = [];
  const callArgs = [];
  for (const arg of sig.args) {
    if (!arg || typeof arg.name !== 'string' || typeof arg.type !== 'string') {
      throw new Error('Each signature.args entry needs { name, type }.');
    }
    if (!Object.prototype.hasOwnProperty.call(payload, arg.name)) {
      throw new Error(`test case is missing the argument "${arg.name}"`);
    }
    const decl = csDecl(arg.type, `argument "${arg.name}"`);
    const literal = csharpLiteral(arg.type, payload[arg.name], `argument "${arg.name}"`);
    if (literal.length > MAX_LITERAL_BYTES) {
      throw new Error(`argument "${arg.name}" renders to ${literal.length} bytes of C# source, over the ${MAX_LITERAL_BYTES} limit.`);
    }
    declarations.push(`        ${decl} ${arg.name} = ${literal};`);
    callArgs.push(arg.name);
  }

  const className = solutionClassName(sig);
  const method = csharpMethodName(sig.fn);

  // C# permits several public top-level classes per file, so the user's class needs no
  // rewriting — unlike Java, where `public class Solution` beside `public class Main`
  // is a compile error.
  return `// ===== robinhood C# harness (auto-generated, do not edit) =====
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

// ===== USER CODE =====
${userCode}

// ===== HARNESS =====
public class ${HARNESS_CLASS} {
${SERIALIZERS}

    public static void Main() {
${declarations.join('\n')}
        ${className} __sol = new ${className}();
        ${retDecl} __out = __sol.${method}(${callArgs.join(', ')});
        Console.Write("<<<OUT>>>");
        Console.Write(Ser(__out));
        Console.Write("<<<END>>>");
    }
}
`;
}
