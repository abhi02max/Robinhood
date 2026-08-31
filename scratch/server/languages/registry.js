/**
 * THE language capability registry.
 *
 * Before this module, seven places independently decided what a "language" is, and
 * two of them disagreed about the same provider:
 *
 *   execution-engine.js   SUPPORTED_LANGUAGES, PAIZA_LANG, JUDGE0_LANG_ID,
 *                         PISTON_LANG, CPP_TYPE_MAP, normalizeLanguage
 *   execution/judge0.js   mapJudge0Language -- had java: 62 but no csharp
 *   execution/security.js SUPPORTED_RUN_LANGUAGES, SUPPORTED_SUBMIT_LANGUAGES
 *   debugger-router.js    its own SUPPORTED_LANGUAGES and alias map
 *   execution-mock.js     a deliberately wider set for offline use
 *   check-judge0.js       an EXPECTED table with "keep this in sync by hand"
 *   src/app/problem/...   LANGUAGES and DEFAULT_STARTERS for the editor
 *
 * The concrete consequence: `security.js` accepted a Java submission, which then died
 * inside the engine with "Unsupported language for entrypoint extraction", while
 * `judge0.js` would have happily compiled Java that the learning path refused. Adding
 * a language meant finding all seven and getting all seven right.
 *
 * DESIGN CONSTRAINTS
 * ------------------
 * 1. **Zero imports.** Both the Express server and the Next client import this. A
 *    single `process.env` read or node builtin here would either break the browser
 *    bundle or drag server code into it.
 * 2. **Generators are named, not referenced.** `starterGenerator`, `harnessGenerator`
 *    and `signatureStrategy` hold string ids that a server-side resolver maps to
 *    functions. Holding the functions themselves would force imports and violate (1).
 * 3. **Provider mappings are explicit per provider.** There is no single "execution
 *    id", because the same language is a different thing to each provider: Judge0
 *    wants a numeric id whose meaning is pinned to a Judge0 version, Paiza wants a
 *    slug, Piston wants a name plus a filename. Collapsing them is what let the two
 *    Judge0 tables drift apart unnoticed.
 * 4. **`productionEnabled` is separate from capability.** A language can have a
 *    complete, tested pipeline and still be hidden, which is how Java, C and C# are
 *    developed without being exposed.
 *
 * @typedef {'javascript'|'python'|'cpp'|'java'|'c'|'csharp'} LanguageKey
 *
 * @typedef {object} ProviderMapping
 * @property {string|number} id       what this provider calls the language
 * @property {string} [filename]      Piston requires a source filename
 * @property {string} [runtimeNote]   the runtime observed on this provider, if known
 * @property {boolean} [verified]     has a real execution been observed on it
 *
 * @typedef {object} TypeMapping
 * @property {string} decl            how the type is declared in this language
 * @property {string} [decoder]       harness helper that decodes JSON into it
 * @property {boolean} [needsLength]  C-style arrays need a companion length argument
 *
 * @typedef {object} LanguageDefinition
 * @property {LanguageKey} key
 * @property {string} displayName
 * @property {string} monacoLanguage
 * @property {string} extension
 * @property {Record<string, ProviderMapping>} providers
 * @property {'source-parse'|'signature'} signatureStrategy
 * @property {string|null} starterGenerator
 * @property {string|null} harnessGenerator
 * @property {boolean} harnessImplemented  does the named generator exist yet? The
 *                                         engine gates execution on this; the service
 *                                         layer gates user submissions on
 *                                         supportsSubmit. Keeping them separate is
 *                                         what lets a language be executed by the
 *                                         verification scripts while still being
 *                                         refused from the API.
 * @property {Record<string, TypeMapping>|null} types  null means dynamically typed:
 *                                                     every canonical type is fine
 * @property {boolean} supportsRun
 * @property {boolean} supportsSubmit
 * @property {boolean} productionEnabled
 * @property {string} [status]        why a language is not production-enabled
 */

// ---------------------------------------------------------------------------
// Canonical signature vocabulary
//
// A problem's signature is stored once, in the C++-flavoured vocabulary the
// `cpp_signature` column already uses. These are the ONLY types a problem may
// declare; each language then says how it expresses them, or that it cannot. Adding
// a canonical type means teaching every typed language about it, which is the point:
// silently unsupported types are how a problem ends up rejecting a whole language at
// submit time.
// ---------------------------------------------------------------------------
export const CANONICAL_TYPES = Object.freeze([
  'int',
  'long long',
  'double',
  'bool',
  'string',
  'vector<int>',
  'vector<long long>',
  'vector<double>',
  'vector<bool>',
  'vector<string>',
  'vector<vector<int>>',
]);

/**
 * Canonicalize a type string written by hand or emitted by inference.
 *
 * Whitespace is COLLAPSED, not stripped. Stripping turned `long long` into `longlong`
 * and made both long-long entries in the C++ table unreachable, so any problem with a
 * value outside 32 bits was rejected as "unsupported argument type".
 */
export function normalizeType(type) {
  return String(type || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*<\s*/g, '<')
    .replace(/\s*>\s*/g, '>')
    .trim();
}

// ---------------------------------------------------------------------------
// Language aliases
// ---------------------------------------------------------------------------
const ALIASES = Object.freeze({
  'c++': 'cpp', cplusplus: 'cpp', cxx: 'cpp',
  'c#': 'csharp', cs: 'csharp', dotnet: 'csharp',
  js: 'javascript', node: 'javascript', nodejs: 'javascript',
  py: 'python', python3: 'python',
});

/** Map a loose user-supplied language string onto a canonical key. */
export function normalizeLanguage(language) {
  const raw = String(language || '').toLowerCase().trim();
  return ALIASES[raw] || raw;
}

// ---------------------------------------------------------------------------
// Per-language type tables
// ---------------------------------------------------------------------------

/** C++ — the reference implementation; these decoders exist in the harness today. */
const CPP_TYPES = Object.freeze({
  'int':                 { decl: 'int',                 decoder: 'decodeInt' },
  'long long':           { decl: 'long long',           decoder: 'decodeLL' },
  'double':              { decl: 'double',              decoder: 'decodeD' },
  'bool':                { decl: 'bool',                decoder: 'decodeBool' },
  'string':              { decl: 'string',              decoder: 'decodeStr' },
  'vector<int>':         { decl: 'vector<int>',         decoder: 'decodeVecI' },
  'vector<long long>':   { decl: 'vector<long long>',   decoder: 'decodeVecLL' },
  'vector<double>':      { decl: 'vector<double>',      decoder: 'decodeVecD' },
  'vector<bool>':        { decl: 'vector<bool>',        decoder: 'decodeVecBool' },
  'vector<string>':      { decl: 'vector<string>',      decoder: 'decodeVecStr' },
  'vector<vector<int>>': { decl: 'vector<vector<int>>', decoder: 'decodeMatI' },
});

/** Java — `long` is 64-bit, so `long long` maps to it directly. */
const JAVA_TYPES = Object.freeze({
  'int':                 { decl: 'int',        decoder: 'decodeInt' },
  'long long':           { decl: 'long',       decoder: 'decodeLong' },
  'double':              { decl: 'double',     decoder: 'decodeDouble' },
  'bool':                { decl: 'boolean',    decoder: 'decodeBool' },
  'string':              { decl: 'String',     decoder: 'decodeStr' },
  'vector<int>':         { decl: 'int[]',      decoder: 'decodeIntArray' },
  'vector<long long>':   { decl: 'long[]',     decoder: 'decodeLongArray' },
  'vector<double>':      { decl: 'double[]',   decoder: 'decodeDoubleArray' },
  'vector<bool>':        { decl: 'boolean[]',  decoder: 'decodeBoolArray' },
  'vector<string>':      { decl: 'String[]',   decoder: 'decodeStrArray' },
  'vector<vector<int>>': { decl: 'int[][]',    decoder: 'decodeIntMatrix' },
});

/** C# — same shape as Java; `long` is 64-bit. */
const CSHARP_TYPES = Object.freeze({
  'int':                 { decl: 'int',      decoder: 'DecodeInt' },
  'long long':           { decl: 'long',     decoder: 'DecodeLong' },
  'double':              { decl: 'double',   decoder: 'DecodeDouble' },
  'bool':                { decl: 'bool',     decoder: 'DecodeBool' },
  'string':              { decl: 'string',   decoder: 'DecodeStr' },
  'vector<int>':         { decl: 'int[]',    decoder: 'DecodeIntArray' },
  'vector<long long>':   { decl: 'long[]',   decoder: 'DecodeLongArray' },
  'vector<double>':      { decl: 'double[]', decoder: 'DecodeDoubleArray' },
  'vector<bool>':        { decl: 'bool[]',   decoder: 'DecodeBoolArray' },
  'vector<string>':      { decl: 'string[]', decoder: 'DecodeStrArray' },
  'vector<vector<int>>': { decl: 'int[][]',  decoder: 'DecodeIntMatrix' },
});

/**
 * C — structurally different from every other language here.
 *
 * An array carries no length, so every array argument needs a companion size
 * parameter, exactly as LeetCode's C signatures do (`int* nums, int numsSize`). That
 * is what `needsLength` records, and it is why C cannot reuse the C++ starter
 * generator despite sharing a compiler family today.
 *
 * `vector<vector<int>>` is deliberately absent: a 2-D array needs both a row count
 * and a per-row column count, and no problem in the current curriculum requires a
 * matrix in C. Declaring it here without a harness that handles the double
 * indirection would let a problem claim C support it does not have.
 */
const C_TYPES = Object.freeze({
  'int':               { decl: 'int',        decoder: 'decode_int' },
  'long long':         { decl: 'long long',  decoder: 'decode_ll' },
  'double':            { decl: 'double',     decoder: 'decode_double' },
  'bool':              { decl: 'bool',       decoder: 'decode_bool' },
  'string':            { decl: 'char*',      decoder: 'decode_str' },
  'vector<int>':       { decl: 'int*',       decoder: 'decode_int_array',    needsLength: true },
  'vector<long long>': { decl: 'long long*', decoder: 'decode_ll_array',     needsLength: true },
  'vector<double>':    { decl: 'double*',    decoder: 'decode_double_array', needsLength: true },
  'vector<bool>':      { decl: 'bool*',      decoder: 'decode_bool_array',   needsLength: true },
  'vector<string>':    { decl: 'char**',     decoder: 'decode_str_array',    needsLength: true },
});

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

/** @type {Record<LanguageKey, LanguageDefinition>} */
export const LANGUAGES = Object.freeze({
  javascript: {
    key: 'javascript',
    displayName: 'JavaScript',
    monacoLanguage: 'javascript',
    extension: 'js',
    providers: {
      paiza:  { id: 'javascript', runtimeNote: 'Node 16.17.1', verified: true },
      judge0: { id: 63, runtimeNote: 'Node 12.14.0 on CE 1.13.x', verified: false },
      piston: { id: 'javascript', filename: 'main.js', verified: false },
    },
    // The entrypoint is found by reading the submitted source: the last top-level
    // function whose parameter names match the payload keys.
    signatureStrategy: 'source-parse',
    starterGenerator: 'js-params',
    harnessGenerator: 'javascript',
    harnessImplemented: true,
    types: null,
    supportsRun: true,
    supportsSubmit: true,
    productionEnabled: true,
  },

  python: {
    key: 'python',
    displayName: 'Python',
    monacoLanguage: 'python',
    extension: 'py',
    providers: {
      paiza:  { id: 'python3', runtimeNote: 'Python 3.11.13', verified: true },
      judge0: { id: 71, runtimeNote: 'Python 3.8.1 on CE 1.13.x', verified: false },
      piston: { id: 'python', filename: 'main.py', verified: false },
    },
    signatureStrategy: 'source-parse',
    starterGenerator: 'py-params',
    harnessGenerator: 'python',
    harnessImplemented: true,
    types: null,
    supportsRun: true,
    supportsSubmit: true,
    productionEnabled: true,
  },

  cpp: {
    key: 'cpp',
    displayName: 'C++',
    monacoLanguage: 'cpp',
    extension: 'cpp',
    providers: {
      paiza:  { id: 'cpp', runtimeNote: 'Clang 18, C++20', verified: true },
      judge0: { id: 54, runtimeNote: 'GCC 9.2.0, -std=c++17 on CE 1.13.x', verified: false },
      // Piston names it "c++", not "cpp" -- exactly the kind of per-provider
      // difference that a single shared "execution id" cannot represent.
      piston: { id: 'c++', filename: 'main.cpp', verified: false },
    },
    signatureStrategy: 'signature',
    starterGenerator: 'cpp-signature',
    harnessGenerator: 'cpp',
    harnessImplemented: true,
    types: CPP_TYPES,
    supportsRun: true,
    supportsSubmit: true,
    productionEnabled: true,
  },

  java: {
    key: 'java',
    displayName: 'Java',
    monacoLanguage: 'java',
    extension: 'java',
    providers: {
      paiza:  { id: 'java', runtimeNote: 'OpenJDK 18', verified: false },
      // 62 comes from execution/judge0.js, which had Java when the learning
      // engine's own table did not. Never exercised against a live host.
      judge0: { id: 62, runtimeNote: 'OpenJDK 13.0.1 on CE 1.13.x', verified: false },
    },
    signatureStrategy: 'signature',
    starterGenerator: 'java-signature',
    harnessGenerator: 'java',
    harnessImplemented: true,
    types: JAVA_TYPES,
    supportsRun: true,
    supportsSubmit: true,
    productionEnabled: true,
  },

  c: {
    key: 'c',
    displayName: 'C',
    monacoLanguage: 'c',
    extension: 'c',
    providers: {
      paiza:  { id: 'c', runtimeNote: 'Clang 14, C17', verified: false },
      // 50 is C (GCC 9.2.0). The old table used 54 -- the C++ id -- to run C
      // through the C++ harness, which is why C submissions never behaved like C.
      judge0: { id: 50, runtimeNote: 'GCC 9.2.0 on CE 1.13.x', verified: false },
    },
    signatureStrategy: 'signature',
    starterGenerator: 'c-signature',
    harnessGenerator: 'c',
    harnessImplemented: false,
    types: C_TYPES,
    supportsRun: false,
    supportsSubmit: false,
    productionEnabled: false,
    status: 'Phase 2C. Needs its own compiler id and length-parameter conventions; '
      + 'previously compiled as C++, which made it C in name only.',
  },

  csharp: {
    key: 'csharp',
    displayName: 'C#',
    monacoLanguage: 'csharp',
    extension: 'cs',
    providers: {
      paiza:  { id: 'csharp', runtimeNote: 'Mono', verified: false },
      judge0: { id: 51, runtimeNote: 'Mono 6.6.0.161 on CE 1.13.x', verified: false },
    },
    signatureStrategy: 'signature',
    starterGenerator: 'csharp-signature',
    harnessGenerator: 'csharp',
    harnessImplemented: false,
    types: CSHARP_TYPES,
    supportsRun: false,
    supportsSubmit: false,
    productionEnabled: false,
    status: 'Phase 2D. buildCsharpProgram exists but is dead code -- it was never '
      + 'reachable because only cpp skipped the JS/Python entrypoint extractor.',
  },
});

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/** @returns {LanguageDefinition|null} */
export function getLanguage(language) {
  return LANGUAGES[normalizeLanguage(language)] || null;
}

/** Every registered language, in a stable display order. */
export function listLanguages() {
  return Object.values(LANGUAGES);
}

/** Languages the UI may offer. Everything else is registered but hidden. */
export function productionLanguages() {
  return listLanguages().filter((l) => l.productionEnabled);
}

/**
 * Languages the engine can physically execute right now, production-enabled or not.
 *
 * This is the engine's gate. It is wider than `productionLanguages()` on purpose:
 * during Phase 2 a language's harness is implemented and driven by the verification
 * scripts well before the API or the editor will accept it.
 */
export function executableLanguages() {
  return listLanguages().filter((l) => l.harnessImplemented);
}

/** True when the engine has a harness builder for this language. */
export function isExecutable(language) {
  return Boolean(getLanguage(language)?.harnessImplemented);
}

export function isProductionEnabled(language) {
  return Boolean(getLanguage(language)?.productionEnabled);
}

export function canRun(language) {
  return Boolean(getLanguage(language)?.supportsRun);
}

export function canSubmit(language) {
  return Boolean(getLanguage(language)?.supportsSubmit);
}

/**
 * What `provider` calls `language`, or null when it has no mapping.
 *
 * Callers must treat null as "this provider cannot run this language" rather than
 * falling back to a default id -- a wrong id compiles the wrong language and reports
 * a syntax error in code that is perfectly valid.
 */
export function providerLanguageId(language, provider) {
  const mapping = getLanguage(language)?.providers?.[String(provider || '').toLowerCase()];
  return mapping ? mapping.id : null;
}

/** Full provider mapping (id plus filename/runtime notes), or null. */
export function providerMapping(language, provider) {
  return getLanguage(language)?.providers?.[String(provider || '').toLowerCase()] || null;
}

// ---------------------------------------------------------------------------
// Capability: can THIS language express THIS problem?
// ---------------------------------------------------------------------------

/**
 * Can `language` express `type`?
 *
 * Dynamically typed languages (`types: null`) can express anything in the canonical
 * vocabulary, because the harness passes decoded JSON straight through.
 */
export function languageSupportsType(language, type) {
  const def = getLanguage(language);
  if (!def) return false;
  const canonical = normalizeType(type);
  if (!CANONICAL_TYPES.includes(canonical)) return false;
  if (def.types === null) return true;
  return Object.prototype.hasOwnProperty.call(def.types, canonical);
}

/** The declaration `language` uses for `type`, or null if it cannot express it. */
export function typeDeclaration(language, type) {
  const def = getLanguage(language);
  if (!def) return null;
  const canonical = normalizeType(type);
  if (def.types === null) return null;
  return def.types[canonical] || null;
}

/**
 * Can `language` express a whole problem signature?
 *
 * This is the function that decides per-problem language capability. It is
 * deliberately NOT a blanket "this language is enabled, so every problem supports
 * it": a problem whose answer is a matrix cannot be offered in C today, and claiming
 * otherwise produces a compile error the user cannot act on.
 *
 * @param {string} language
 * @param {{fn?: string, args?: {name: string, type: string}[], ret?: string}|null} signature
 * @returns {{supported: true} | {supported: false, reason: string}}
 */
export function languageSupportsSignature(language, signature) {
  const def = getLanguage(language);
  if (!def) return { supported: false, reason: `unknown language "${language}"` };

  // Dynamically typed languages take their shape from the submitted source and need
  // no signature at all.
  if (def.signatureStrategy === 'source-parse') return { supported: true };

  if (!signature || typeof signature !== 'object') {
    return { supported: false, reason: `${def.displayName} needs a signature and the problem has none` };
  }
  if (!signature.fn) {
    return { supported: false, reason: 'signature has no function name' };
  }
  if (!Array.isArray(signature.args)) {
    return { supported: false, reason: 'signature.args must be an array' };
  }

  const problems = [];
  for (const arg of signature.args) {
    if (!arg || typeof arg.name !== 'string' || typeof arg.type !== 'string') {
      problems.push('every argument needs { name, type }');
      continue;
    }
    if (!languageSupportsType(def.key, arg.type)) {
      problems.push(`argument "${arg.name}": ${def.displayName} cannot express ${normalizeType(arg.type)}`);
    }
  }
  if (typeof signature.ret !== 'string' || !signature.ret) {
    problems.push('signature has no return type');
  } else if (!languageSupportsType(def.key, signature.ret)) {
    problems.push(`return type: ${def.displayName} cannot express ${normalizeType(signature.ret)}`);
  }

  return problems.length ? { supported: false, reason: problems.join('; ') } : { supported: true };
}

/**
 * Which languages can express this problem, and why the others cannot.
 *
 * @returns {{supported: LanguageKey[], unsupported: {key: LanguageKey, reason: string}[]}}
 */
export function languagesForSignature(signature, { includeHidden = false } = {}) {
  const supported = [];
  const unsupported = [];
  for (const def of listLanguages()) {
    if (!includeHidden && !def.productionEnabled) continue;
    const verdict = languageSupportsSignature(def.key, signature);
    if (verdict.supported) supported.push(def.key);
    else unsupported.push({ key: def.key, reason: verdict.reason });
  }
  return { supported, unsupported };
}
