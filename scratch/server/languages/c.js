/**
 * C pipeline: starter generation and harness generation.
 *
 * C is the structurally hardest of the six, and none of it is incidental:
 *
 * 1. **An array carries no length.** Every array argument needs a companion size
 *    parameter, so `vector<int> nums` becomes `int* nums, int numsSize` — LeetCode's
 *    own C convention. This is why C cannot reuse the C++ starter generator despite
 *    sharing a compiler family; the parameter LIST is a different shape, not just a
 *    different spelling.
 * 2. **An array return needs an out-parameter.** A function cannot return a length, so
 *    array-returning problems gain a trailing `int* returnSize` that the user must
 *    set. 23 of the 86 C-capable problems are in this shape.
 * 3. **No matrices.** A 2-D array needs a row count *and* a per-row column count
 *    (`int** grid, int gridSize, int* gridColSize`), and nothing in the current
 *    curriculum requires one in C. The registry therefore omits
 *    `vector<vector<int>>` from C's type table, which excludes 10 problems by
 *    capability rather than letting them fail at compile time.
 *
 * Arguments are baked in as literals, for the same reason as Java: the largest
 * input_payload across the whole curriculum is 101 bytes, so there is nothing to be
 * gained from a runtime parser. The harness therefore contains no JSON parsing —
 * only output serialization.
 *
 * BEFORE THIS MODULE, C WAS NOT C. `buildProgram` routed `c` into
 * `buildCppProgram`, and the registry mapped it to Judge0 id 54 — the C++ compiler.
 * A user selecting C got a C++ compiler, so C++-only code compiled and genuinely
 * C-specific code could behave differently than a C compiler would.
 *
 * LANGUAGE LEVEL
 * --------------
 * Targets C99/C11 conservatively. Judge0 CE 1.13.x ships GCC 9.2.0 (gnu11 default);
 * Paiza runs Clang 14/C17. Nothing here needs anything newer than C99 apart from
 * `<stdbool.h>`, which is C99 itself.
 */
import { normalizeType, typeDeclaration } from './registry.js';

const MAX_LITERAL_BYTES = 24_000;

/** The name of the companion length parameter for an array argument. */
export function sizeParamName(argName) {
  return `${argName}Size`;
}

/** The out-parameter an array-returning function uses to report its length. */
export const RETURN_SIZE_PARAM = 'returnSize';

const ARRAY_TYPES = new Set([
  'vector<int>', 'vector<long long>', 'vector<double>', 'vector<bool>', 'vector<string>',
]);

export function isArrayType(type) {
  return ARRAY_TYPES.has(normalizeType(type));
}

function cDecl(type, what) {
  const mapping = typeDeclaration('c', type);
  if (!mapping) throw new Error(`${what}: C cannot express the type "${normalizeType(type)}"`);
  return mapping.decl;
}

// ---------------------------------------------------------------------------
// Literals
// ---------------------------------------------------------------------------

/**
 * Escape a string as a C string literal, byte by byte over its UTF-8 encoding.
 *
 * Octal escapes are used rather than hex because C's `\x` is GREEDY: `"\x41" "2"`
 * inside one literal continues consuming hex digits, so `\x412` is one (overflowing)
 * escape rather than "A2". Octal `\NNN` is capped at three digits and cannot run on.
 */
export function cStringLiteral(value) {
  const bytes = Buffer.from(String(value), 'utf8');
  let out = '"';
  for (const b of bytes) {
    if (b === 0x5c) out += '\\\\';
    else if (b === 0x22) out += '\\"';
    else if (b === 0x0a) out += '\\n';
    else if (b === 0x0d) out += '\\r';
    else if (b === 0x09) out += '\\t';
    else if (b >= 0x20 && b <= 0x7e) out += String.fromCharCode(b);
    else out += `\\${b.toString(8).padStart(3, '0')}`;
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
    return `${value}LL`;
  }
  if (t === 'double') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${what}: expected a finite number, got ${JSON.stringify(value)}`);
    }
    const text = String(value);
    return /[.eE]/.test(text) ? text : `${text}.0`;
  }
  if (t === 'bool') {
    if (typeof value !== 'boolean') throw new Error(`${what}: expected a boolean, got ${JSON.stringify(value)}`);
    return value ? 'true' : 'false';
  }
  if (t === 'string') {
    if (typeof value !== 'string') throw new Error(`${what}: expected a string, got ${JSON.stringify(value)}`);
    return cStringLiteral(value);
  }
  throw new Error(`${what}: C cannot express the type "${t}"`);
}

/** The element type inside an array type, e.g. vector<int> -> int. */
function elementType(type) {
  const m = normalizeType(type).match(/^vector<(.+)>$/);
  if (!m) throw new Error(`not an array type: ${type}`);
  return m[1];
}

/**
 * Emit the declarations for one argument.
 *
 * An array becomes three lines rather than one: a backing array, a pointer to it, and
 * its length. Zero-length arrays get a NULL pointer instead of an empty initialiser,
 * because C forbids a zero-length array declaration — `int a[] = {};` is a
 * constraint violation and GCC only tolerates it as an extension.
 */
function argDeclarations(arg, value) {
  const what = `argument "${arg.name}"`;
  const type = normalizeType(arg.type);

  if (!isArrayType(type)) {
    return { lines: [`    ${cDecl(type, what)} ${arg.name} = ${scalarLiteral(type, value, what)};`], callArgs: [arg.name] };
  }

  if (!Array.isArray(value)) throw new Error(`${what}: expected an array, got ${JSON.stringify(value)}`);
  const elem = elementType(type);
  const elemDecl = cDecl(elem, what);
  const ptrDecl = cDecl(type, what);
  const size = sizeParamName(arg.name);
  const lines = [];

  if (value.length === 0) {
    lines.push(`    ${ptrDecl} ${arg.name} = NULL;`);
    lines.push(`    int ${size} = 0;`);
  } else {
    const items = value.map((v, i) => scalarLiteral(elem, v, `${what}[${i}]`));
    lines.push(`    ${elemDecl} ${arg.name}__data[] = {${items.join(', ')}};`);
    lines.push(`    ${ptrDecl} ${arg.name} = ${arg.name}__data;`);
    lines.push(`    int ${size} = ${value.length};`);
  }
  return { lines, callArgs: [arg.name, size] };
}

// ---------------------------------------------------------------------------
// Output serialization
// ---------------------------------------------------------------------------

const SERIALIZERS = `
static void emit_str(const char* s) {
    if (s == NULL) { printf("null"); return; }
    putchar('"');
    for (const unsigned char* p = (const unsigned char*) s; *p; p++) {
        if (*p == '\\\\') printf("\\\\\\\\");
        else if (*p == '"') printf("\\\\\\"");
        else if (*p == '\\n') printf("\\\\n");
        else if (*p == '\\r') printf("\\\\r");
        else if (*p == '\\t') printf("\\\\t");
        else if (*p < 0x20) printf("\\\\u%04x", *p);
        else putchar(*p);
    }
    putchar('"');
}
static void emit_double(double v) {
    if (v != v || v > 1.7e308 || v < -1.7e308) {
        fprintf(stderr, "result is not a finite number");
        exit(3);
    }
    printf("%.17g", v);
}`;

/**
 * The statements that print one return value as JSON.
 *
 * A NULL array prints `[]` rather than `null`: a user who sets `*returnSize = 0` and
 * returns NULL has produced an empty result, which is a legitimate answer for several
 * problems, and `null` would fail the comparison for the wrong reason.
 */
function emitReturn(retType) {
  const t = normalizeType(retType);
  switch (t) {
    case 'int':       return ['    printf("%d", __out);'];
    case 'long long': return ['    printf("%lld", __out);'];
    case 'double':    return ['    emit_double(__out);'];
    case 'bool':      return ['    printf(__out ? "true" : "false");'];
    case 'string':    return ['    emit_str(__out);'];
    default: break;
  }
  if (!isArrayType(t)) throw new Error(`return type: C cannot express "${t}"`);

  const elem = elementType(t);
  const printItem = {
    'int': '        printf("%d", __out[__i]);',
    'long long': '        printf("%lld", __out[__i]);',
    'double': '        emit_double(__out[__i]);',
    'bool': '        printf(__out[__i] ? "true" : "false");',
    'string': '        emit_str(__out[__i]);',
  }[elem];
  if (!printItem) throw new Error(`return type: C cannot express "${t}"`);

  return [
    '    putchar(\'[\');',
    `    if (__out != NULL) for (int __i = 0; __i < ${RETURN_SIZE_PARAM}; __i++) {`,
    '        if (__i > 0) putchar(\',\');',
    printItem,
    '    }',
    '    putchar(\']\');',
  ];
}

// ---------------------------------------------------------------------------
// Signature rendering
// ---------------------------------------------------------------------------

/**
 * The C parameter list for a signature, in LeetCode's shape.
 *
 * Each array argument is followed by its length, and an array return appends
 * `int* returnSize`.
 */
export function cParameterList(sig) {
  const params = [];
  for (const arg of sig.args || []) {
    if (!arg || typeof arg.name !== 'string' || typeof arg.type !== 'string') {
      throw new Error('Each signature.args entry needs { name, type }.');
    }
    params.push(`${cDecl(arg.type, `argument "${arg.name}"`)} ${arg.name}`);
    if (isArrayType(arg.type)) params.push(`int ${sizeParamName(arg.name)}`);
  }
  if (isArrayType(sig.ret)) params.push(`int* ${RETURN_SIZE_PARAM}`);
  return params;
}

/**
 * Guard against a signature whose own argument names collide with the names this
 * convention generates. `nums` plus a hand-written `numsSize` would produce two
 * parameters with the same name and a compile error in generated code.
 */
function assertNoNameCollisions(sig) {
  const declared = new Set((sig.args || []).map((a) => a && a.name).filter(Boolean));
  for (const arg of sig.args || []) {
    if (!arg || !isArrayType(arg.type)) continue;
    const generated = sizeParamName(arg.name);
    if (declared.has(generated)) {
      throw new Error(`argument "${arg.name}" needs a generated length parameter "${generated}", but the signature already declares an argument with that name`);
    }
  }
  if (isArrayType(sig.ret) && declared.has(RETURN_SIZE_PARAM)) {
    throw new Error(`an array return needs a generated "${RETURN_SIZE_PARAM}" parameter, but the signature already declares an argument with that name`);
  }
}

// ---------------------------------------------------------------------------
// Starter
// ---------------------------------------------------------------------------

/**
 * The C starter shown in the editor.
 *
 * Includes the two things a C user cannot infer from the prose: that the returned
 * array must be heap-allocated, and that `*returnSize` must be set. Omitting that
 * note makes the array problems feel arbitrary.
 *
 * The body compiles untouched, which for an array return means setting `*returnSize`
 * before returning NULL — otherwise the harness reads an uninitialised length.
 */
export function renderCStarter(sig) {
  try {
    assertNoNameCollisions(sig);
    if (!sig.fn) throw new Error('signature has no function name');
    const retDecl = cDecl(sig.ret, 'return type');
    const params = cParameterList(sig);
    const returnsArray = isArrayType(sig.ret);

    const lines = [];
    if (returnsArray) {
      lines.push('/**');
      lines.push(' * Return a malloc\'d array and set *returnSize to its length.');
      lines.push(' */');
    }
    lines.push(`${retDecl} ${sig.fn}(${params.join(', ')}) {`);
    lines.push('    // Write your solution here.');
    if (returnsArray) {
      lines.push(`    *${RETURN_SIZE_PARAM} = 0;`);
      lines.push('    return NULL;');
    } else {
      lines.push(`    return ${zeroValueFor(sig.ret)};`);
    }
    lines.push('}');
    lines.push('');
    return { code: lines.join('\n'), summary: `${retDecl} ${sig.fn}(${params.join(', ')})` };
  } catch (e) {
    return { error: e.message };
  }
}

function zeroValueFor(type) {
  switch (normalizeType(type)) {
    case 'int':       return '0';
    case 'long long': return '0';
    case 'double':    return '0.0';
    case 'bool':      return 'false';
    case 'string':    return 'NULL';
    default:          return 'NULL';
  }
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/**
 * Build a complete, self-contained C program for ONE test case.
 */
export function buildCProgram(userCode, sig, inputPayload) {
  if (!sig || typeof sig !== 'object') {
    throw new Error('C not supported for this problem (no signature configured).');
  }
  if (!sig.fn) throw new Error('signature.fn (function name) is required.');
  if (!Array.isArray(sig.args)) throw new Error('signature.args must be an array.');
  assertNoNameCollisions(sig);

  const retDecl = cDecl(sig.ret, 'return type');
  const returnsArray = isArrayType(sig.ret);
  const payload = inputPayload || {};

  const declarations = [];
  const callArgs = [];
  for (const arg of sig.args) {
    if (!Object.prototype.hasOwnProperty.call(payload, arg.name)) {
      throw new Error(`test case is missing the argument "${arg.name}"`);
    }
    const { lines, callArgs: names } = argDeclarations(arg, payload[arg.name]);
    const rendered = lines.join('\n');
    if (rendered.length > MAX_LITERAL_BYTES) {
      throw new Error(
        `argument "${arg.name}" renders to ${rendered.length} bytes of C source, over the `
        + `${MAX_LITERAL_BYTES} limit.`,
      );
    }
    declarations.push(...lines);
    callArgs.push(...names);
  }

  if (returnsArray) {
    // Initialised so a solution that forgets to set it produces a deterministic empty
    // result rather than reading whatever was on the stack.
    declarations.push(`    int ${RETURN_SIZE_PARAM} = 0;`);
    callArgs.push(`&${RETURN_SIZE_PARAM}`);
  }

  return `/* ===== robinhood C harness (auto-generated, do not edit) ===== */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
${SERIALIZERS}

/* ===== USER CODE ===== */
${userCode}

/* ===== HARNESS ===== */
int main(void) {
${declarations.join('\n')}
    ${retDecl} __out = ${sig.fn}(${callArgs.join(', ')});
    printf("<<<OUT>>>");
${emitReturn(sig.ret).join('\n')}
    printf("<<<END>>>");
    return 0;
}
`;
}
