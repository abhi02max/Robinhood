/**
 * Java pipeline: starter generation and harness generation.
 *
 * WHY LITERALS INSTEAD OF A JSON DECODER
 * -------------------------------------
 * The C++ harness embeds a small JSON parser because it reads one test case from
 * stdin, which is what let one compiled program serve every case. Java does not need
 * that, and the audit says so with numbers: across all 96 problems and 1,168 test
 * cases the largest `input_payload` is **101 bytes**, the average is 30, and the
 * longest array anywhere is 16 elements. Only seven distinct signature types are in
 * use at all.
 *
 * At that size the arguments can simply be baked into the source as Java literals, so
 * this harness contains no parser — only a serializer for the return value, which is
 * needed either way and is far easier to get right than parsing.
 *
 * It costs nothing in compile time. Every provider recompiles per case regardless:
 * Paiza's `/runners/create` is an independent compile-and-run, and Judge0's batch
 * carries a `source_code` per submission. So "one program, N stdins" was never
 * buying a shared compile.
 *
 * It also makes a failing case reproducible by hand: the generated program is
 * self-contained, so it can be pasted into any compiler and run.
 *
 * The one real limit is Java's 64KB per-method bytecode ceiling, which a very large
 * array initialiser could hit. At 101 bytes of input there are three orders of
 * magnitude of headroom, and `MAX_LITERAL_BYTES` below fails loudly rather than
 * emitting something that mysteriously will not compile.
 *
 * LANGUAGE LEVEL
 * --------------
 * Targets **Java 8 syntax**, deliberately below the OpenJDK 13 that Judge0 CE 1.13.x
 * ships, rather than the OpenJDK 18 Paiza runs. No `var`, no switch expressions, no
 * text blocks, no records, no streams. Development happens on Paiza; the older
 * compiler is the one that has to accept the output. See docs/judge0-revalidation.md.
 */
import { normalizeType, typeDeclaration } from './registry.js';

/**
 * Refuse to emit an argument literal beyond this size.
 *
 * Java caps a single method's bytecode at 64KB, and a huge array initialiser inside
 * `main` is the way to hit it. The failure mode is a compiler error about method size
 * that says nothing about test data, so this turns it into a clear harness error.
 */
const MAX_LITERAL_BYTES = 24_000;

// ---------------------------------------------------------------------------
// Literals
// ---------------------------------------------------------------------------

/**
 * Escape a string for embedding in Java SOURCE.
 *
 * Non-ASCII is escaped to \\uXXXX rather than passed through, because the source is
 * shipped to a provider whose file encoding is not something we control. A single
 * mis-decoded byte would be a compile error in generated code the user never wrote.
 */
export function javaStringLiteral(value) {
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

function javaIntLiteral(value, what) {
  if (!Number.isInteger(value)) throw new Error(`${what}: expected an integer, got ${JSON.stringify(value)}`);
  return String(value);
}

function javaLongLiteral(value, what) {
  if (!Number.isInteger(value)) throw new Error(`${what}: expected an integer, got ${JSON.stringify(value)}`);
  return `${value}L`;
}

/**
 * A Java `double` literal.
 *
 * `String(5)` is "5", which Java types as an int; assigning it to a double is legal
 * but `new double[]{5}` next to `new double[]{5.5}` reads inconsistently and an
 * integer literal outside int range would not compile at all. Forcing a decimal point
 * keeps every double literal unambiguous.
 */
function javaDoubleLiteral(value, what) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${what}: expected a finite number, got ${JSON.stringify(value)}`);
  }
  const text = String(value);
  return /[.eE]/.test(text) ? text : `${text}.0`;
}

function javaBoolLiteral(value, what) {
  if (typeof value !== 'boolean') throw new Error(`${what}: expected a boolean, got ${JSON.stringify(value)}`);
  return value ? 'true' : 'false';
}

function expectArray(value, what) {
  if (!Array.isArray(value)) throw new Error(`${what}: expected an array, got ${JSON.stringify(value)}`);
  return value;
}

/**
 * Render one JSON value as a Java literal of the given canonical type.
 *
 * Throws rather than guessing when the value does not match the declared type: a
 * literal of the wrong shape is a compile error in generated code, which reads to the
 * user as a platform fault.
 */
export function javaLiteral(type, value, what = 'value') {
  const t = normalizeType(type);
  switch (t) {
    case 'int':       return javaIntLiteral(value, what);
    case 'long long': return javaLongLiteral(value, what);
    case 'double':    return javaDoubleLiteral(value, what);
    case 'bool':      return javaBoolLiteral(value, what);
    case 'string':
      if (typeof value !== 'string') throw new Error(`${what}: expected a string, got ${JSON.stringify(value)}`);
      return javaStringLiteral(value);
    case 'vector<int>':
      return `new int[]{${expectArray(value, what).map((v, i) => javaIntLiteral(v, `${what}[${i}]`)).join(', ')}}`;
    case 'vector<long long>':
      return `new long[]{${expectArray(value, what).map((v, i) => javaLongLiteral(v, `${what}[${i}]`)).join(', ')}}`;
    case 'vector<double>':
      return `new double[]{${expectArray(value, what).map((v, i) => javaDoubleLiteral(v, `${what}[${i}]`)).join(', ')}}`;
    case 'vector<bool>':
      return `new boolean[]{${expectArray(value, what).map((v, i) => javaBoolLiteral(v, `${what}[${i}]`)).join(', ')}}`;
    case 'vector<string>':
      return `new String[]{${expectArray(value, what).map((v, i) => {
        if (typeof v !== 'string') throw new Error(`${what}[${i}]: expected a string, got ${JSON.stringify(v)}`);
        return javaStringLiteral(v);
      }).join(', ')}}`;
    case 'vector<vector<int>>': {
      const rows = expectArray(value, what).map((row, i) => {
        const inner = expectArray(row, `${what}[${i}]`).map((v, j) => javaIntLiteral(v, `${what}[${i}][${j}]`));
        return `{${inner.join(', ')}}`;
      });
      return `new int[][]{${rows.join(', ')}}`;
    }
    default:
      throw new Error(`${what}: Java cannot express the type "${t}"`);
  }
}

// ---------------------------------------------------------------------------
// Return-value serialization
//
// This is the only runtime code the harness needs. It emits JSON so the engine's
// existing deep comparison — exact for integers, tolerant for doubles — works
// unchanged, exactly as it does for the other languages.
// ---------------------------------------------------------------------------

const SERIALIZERS = `
    private static String esc(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder("\\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '\\\\') b.append("\\\\\\\\");
            else if (c == '"') b.append("\\\\\\"");
            else if (c == '\\n') b.append("\\\\n");
            else if (c == '\\r') b.append("\\\\r");
            else if (c == '\\t') b.append("\\\\t");
            else if (c < 0x20) b.append(String.format("\\\\u%04x", (int) c));
            else b.append(c);
        }
        return b.append('"').toString();
    }
    private static String ser(int v) { return Integer.toString(v); }
    private static String ser(long v) { return Long.toString(v); }
    private static String ser(boolean v) { return v ? "true" : "false"; }
    private static String ser(double v) {
        if (Double.isNaN(v) || Double.isInfinite(v)) {
            throw new RuntimeException("result is not a finite number: " + v);
        }
        return Double.toString(v);
    }
    private static String ser(String v) { return esc(v); }
    private static String ser(int[] a) {
        if (a == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(a[i]); }
        return b.append(']').toString();
    }
    private static String ser(long[] a) {
        if (a == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(a[i]); }
        return b.append(']').toString();
    }
    private static String ser(double[] a) {
        if (a == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(ser(a[i])); }
        return b.append(']').toString();
    }
    private static String ser(boolean[] a) {
        if (a == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(a[i] ? "true" : "false"); }
        return b.append(']').toString();
    }
    private static String ser(String[] a) {
        if (a == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(esc(a[i])); }
        return b.append(']').toString();
    }
    private static String ser(int[][] a) {
        if (a == null) return "null";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(ser(a[i])); }
        return b.append(']').toString();
    }`;

// ---------------------------------------------------------------------------
// Signature helpers
// ---------------------------------------------------------------------------

/** The Java declaration for a canonical type, or throw with a clear reason. */
function javaDecl(type, what) {
  const mapping = typeDeclaration('java', type);
  if (!mapping) throw new Error(`${what}: Java cannot express the type "${normalizeType(type)}"`);
  return mapping.decl;
}

/**
 * The class the user is expected to write.
 *
 * `cpp_signature.class` records how the reference solution was written. Java has no
 * top-level functions, so unlike C++ there is no free-function alternative: the
 * method always lives on a class, and Solution is the convention the starter sets.
 */
function solutionClassName(sig) {
  const declared = typeof sig.class === 'string' ? sig.class.trim() : '';
  return declared || 'Solution';
}

// ---------------------------------------------------------------------------
// Starter
// ---------------------------------------------------------------------------

/**
 * The Java starter shown in the editor.
 *
 * No `main`, no imports the user did not ask for, and no I/O — the harness supplies
 * all of it. The user writes only the method.
 *
 * The body is `return <zero value>;` rather than empty, because a Java method with a
 * non-void return type and no return statement does not compile. An untouched starter
 * has to compile, or the first thing a user sees is an error they did not cause.
 */
export function renderJavaStarter(sig) {
  const problems = [];
  let retDecl = null;
  try {
    retDecl = javaDecl(sig.ret, 'return type');
  } catch (e) {
    problems.push(e.message);
  }

  const params = [];
  for (const arg of sig.args || []) {
    try {
      params.push(`${javaDecl(arg.type, `argument "${arg.name}"`)} ${arg.name}`);
    } catch (e) {
      problems.push(e.message);
    }
  }
  if (!sig.fn) problems.push('signature has no function name');
  if (problems.length) return { error: problems.join('; ') };

  const zero = zeroValueFor(sig.ret);
  return {
    code: [
      `class ${solutionClassName(sig)} {`,
      `    public ${retDecl} ${sig.fn}(${params.join(', ')}) {`,
      '        // Write your solution here.',
      `        return ${zero};`,
      '    }',
      '}',
      '',
    ].join('\n'),
    summary: `${retDecl} ${sig.fn}(${params.join(', ')})`,
  };
}

/** A compiling placeholder return value for each canonical type. */
function zeroValueFor(type) {
  switch (normalizeType(type)) {
    case 'int':       return '0';
    case 'long long': return '0L';
    case 'double':    return '0.0';
    case 'bool':      return 'false';
    case 'string':    return '""';
    default:          return 'null';  // every array type
  }
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/**
 * Java permits exactly one public top-level class per file, and it must match the
 * filename. The providers compile this as Main.java, so `public class Main` is the
 * entry point and the user's class must not also be public.
 *
 * A user who writes `public class Solution` is not making a mistake — it is the
 * habit every tutorial teaches — so the modifier is stripped rather than rejected.
 * Only top-level declarations are touched: an indented `public class` is a nested
 * member, where `public` is both legal and meaningful.
 */
export function stripPublicFromTopLevelClasses(userCode) {
  return String(userCode || '').replace(
    /^public\s+((?:final\s+|abstract\s+)?(?:class|interface|enum)\s+)/gm,
    '$1',
  );
}

/**
 * Build a complete, self-contained Java program for ONE test case.
 *
 * @param {string} userCode      the submitted source, expected to declare `class Solution`
 * @param {object} sig           canonical signature { fn, class, args[], ret }
 * @param {object} inputPayload  this case's arguments, keyed by parameter name
 */
export function buildJavaProgram(userCode, sig, inputPayload) {
  if (!sig || typeof sig !== 'object') {
    throw new Error('Java not supported for this problem (no signature configured).');
  }
  if (!sig.fn) throw new Error('signature.fn (method name) is required.');
  if (!Array.isArray(sig.args)) throw new Error('signature.args must be an array.');

  const retDecl = javaDecl(sig.ret, 'return type');
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
    const decl = javaDecl(arg.type, `argument "${arg.name}"`);
    const literal = javaLiteral(arg.type, payload[arg.name], `argument "${arg.name}"`);
    if (literal.length > MAX_LITERAL_BYTES) {
      throw new Error(
        `argument "${arg.name}" renders to ${literal.length} bytes of Java source, over the `
        + `${MAX_LITERAL_BYTES} limit. Java caps one method's bytecode at 64KB, so an `
        + 'initialiser this large fails to compile for reasons unrelated to the solution.',
      );
    }
    declarations.push(`        ${decl} ${arg.name} = ${literal};`);
    callArgs.push(arg.name);
  }

  const className = solutionClassName(sig);

  // Called through an instance even if the user made the method static, which Java
  // allows. Requiring one or the other would reject a submission for a style choice.
  return `// ===== robinhood Java harness (auto-generated, do not edit) =====
import java.util.*;

// ===== USER CODE =====
${stripPublicFromTopLevelClasses(userCode)}

// ===== HARNESS =====
public class Main {
${SERIALIZERS}

    public static void main(String[] args) {
${declarations.join('\n')}
        ${className} __sol = new ${className}();
        ${retDecl} __out = __sol.${sig.fn}(${callArgs.join(', ')});
        System.out.print("<<<OUT>>>");
        System.out.print(ser(__out));
        System.out.print("<<<END>>>");
    }
}
`;
}
