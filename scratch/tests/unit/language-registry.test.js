import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CANONICAL_TYPES,
  LANGUAGES,
  canRun,
  canSubmit,
  executableLanguages,
  getLanguage,
  isProductionEnabled,
  languageSupportsSignature,
  languageSupportsType,
  languagesForSignature,
  listLanguages,
  normalizeLanguage,
  normalizeType,
  productionLanguages,
  providerLanguageId,
  providerMapping,
  typeDeclaration,
} from '../../server/languages/registry.js';

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

test('every language declares the full set of required fields', () => {
  for (const def of listLanguages()) {
    assert.equal(typeof def.key, 'string', `${def.key}: key`);
    assert.equal(typeof def.displayName, 'string', `${def.key}: displayName`);
    assert.equal(typeof def.monacoLanguage, 'string', `${def.key}: monacoLanguage`);
    assert.equal(typeof def.extension, 'string', `${def.key}: extension`);
    assert.equal(typeof def.providers, 'object', `${def.key}: providers`);
    assert.ok(['source-parse', 'signature'].includes(def.signatureStrategy), `${def.key}: signatureStrategy`);
    assert.equal(typeof def.supportsRun, 'boolean', `${def.key}: supportsRun`);
    assert.equal(typeof def.supportsSubmit, 'boolean', `${def.key}: supportsSubmit`);
    assert.equal(typeof def.productionEnabled, 'boolean', `${def.key}: productionEnabled`);
  }
});

test('the registry key matches the map key it is stored under', () => {
  for (const [mapKey, def] of Object.entries(LANGUAGES)) {
    assert.equal(def.key, mapKey);
  }
});

test('a language that is not production-enabled explains why', () => {
  for (const def of listLanguages()) {
    if (def.productionEnabled) continue;
    assert.ok(def.status && def.status.length > 20, `${def.key} must document why it is hidden`);
  }
});

test('a hidden language cannot advertise run or submit support', () => {
  // Exposure and capability are separate flags, but "hidden yet submittable" would
  // let the editor offer a language the release gate has not cleared.
  for (const def of listLanguages()) {
    if (def.productionEnabled) continue;
    assert.equal(def.supportsRun, false, `${def.key}: supportsRun while hidden`);
    assert.equal(def.supportsSubmit, false, `${def.key}: supportsSubmit while hidden`);
  }
});

// ---------------------------------------------------------------------------
// Production set — this is what the editor offers
// ---------------------------------------------------------------------------

test('exactly JavaScript, Python and C++ are production-enabled', () => {
  assert.deepEqual(productionLanguages().map((l) => l.key), ['javascript', 'python', 'cpp']);
});

test('Java, C and C# are registered but hidden', () => {
  for (const key of ['java', 'c', 'csharp']) {
    assert.ok(getLanguage(key), `${key} must be registered`);
    assert.equal(isProductionEnabled(key), false, `${key} must be hidden`);
  }
});

test('every registered language names a harness generator', () => {
  // The name is a promise that a resolver can find an implementation; harnessImplemented
  // records whether that promise has been kept yet.
  for (const def of listLanguages()) {
    assert.equal(typeof def.harnessGenerator, 'string', `${def.key}: harnessGenerator`);
    assert.equal(typeof def.harnessImplemented, 'boolean', `${def.key}: harnessImplemented`);
  }
});

test('only JavaScript, Python and C++ have an implemented harness today', () => {
  // Phase 2B-2D flip java, c and csharp here, one at a time, each behind its own
  // starter suite and browser E2E.
  assert.deepEqual(executableLanguages().map((l) => l.key), ['javascript', 'python', 'cpp']);
});

test('a language cannot be submittable without an implemented harness', () => {
  for (const def of listLanguages()) {
    if (!def.harnessImplemented) {
      assert.equal(def.supportsSubmit, false, `${def.key}: submittable with no harness`);
      assert.equal(def.productionEnabled, false, `${def.key}: exposed with no harness`);
    }
  }
});

// ---------------------------------------------------------------------------
// Aliases and normalisation
// ---------------------------------------------------------------------------

test('language aliases resolve to canonical keys', () => {
  assert.equal(normalizeLanguage('C++'), 'cpp');
  assert.equal(normalizeLanguage('c#'), 'csharp');
  assert.equal(normalizeLanguage('  JavaScript '), 'javascript');
  assert.equal(normalizeLanguage('python3'), 'python');
  assert.equal(normalizeLanguage('node'), 'javascript');
  assert.equal(normalizeLanguage('nonsense'), 'nonsense');
});

test('type normalisation collapses whitespace instead of deleting it', () => {
  // Deleting it turned `long long` into `longlong`, which matched no entry, so any
  // problem with a value outside 32 bits was rejected as an unsupported type.
  assert.equal(normalizeType('long  long'), 'long long');
  assert.equal(normalizeType('vector< long long >'), 'vector<long long>');
  assert.equal(normalizeType('vector<vector<int> >'), 'vector<vector<int>>');
  assert.equal(normalizeType('  int '), 'int');
});

// ---------------------------------------------------------------------------
// Provider mappings — explicit per provider, never a shared "execution id"
// ---------------------------------------------------------------------------

test('provider ids match the values the engine used before the registry', () => {
  // Pinning the pre-existing runtime behaviour: these are the ids that were in
  // JUDGE0_LANG_ID, PAIZA_LANG and PISTON_LANG.
  assert.equal(providerLanguageId('javascript', 'paiza'), 'javascript');
  assert.equal(providerLanguageId('python', 'paiza'), 'python3');
  assert.equal(providerLanguageId('cpp', 'paiza'), 'cpp');

  assert.equal(providerLanguageId('javascript', 'judge0'), 63);
  assert.equal(providerLanguageId('python', 'judge0'), 71);
  assert.equal(providerLanguageId('cpp', 'judge0'), 54);

  assert.equal(providerMapping('javascript', 'piston').filename, 'main.js');
  assert.equal(providerMapping('python', 'piston').filename, 'main.py');
  assert.equal(providerMapping('cpp', 'piston').filename, 'main.cpp');
});

test('the same language can have a different id on each provider', () => {
  // C++ is "cpp" to Paiza, 54 to Judge0 and "c++" to Piston. A single shared
  // execution id cannot express that, and guessing one compiles the wrong language.
  assert.equal(providerLanguageId('cpp', 'paiza'), 'cpp');
  assert.equal(providerLanguageId('cpp', 'judge0'), 54);
  assert.equal(providerLanguageId('cpp', 'piston'), 'c++');
});

test('C no longer borrows the C++ Judge0 id', () => {
  // The old table mapped c -> 54 to run C through the C++ harness, which made C a
  // label rather than a language. 50 is C (GCC).
  assert.equal(providerLanguageId('c', 'judge0'), 50);
  assert.notEqual(providerLanguageId('c', 'judge0'), providerLanguageId('cpp', 'judge0'));
});

test('the two previously divergent Judge0 tables are reconciled', () => {
  // execution-engine.js had csharp:51 and no java; execution/judge0.js had java:62
  // and no csharp. Both now exist in one place.
  assert.equal(providerLanguageId('java', 'judge0'), 62);
  assert.equal(providerLanguageId('csharp', 'judge0'), 51);
});

test('an unmapped provider/language pair returns null rather than a default', () => {
  // A fallback id would compile the wrong language and report a syntax error in code
  // that is actually valid.
  assert.equal(providerLanguageId('java', 'piston'), null);
  assert.equal(providerLanguageId('c', 'piston'), null);
  assert.equal(providerLanguageId('nonsense', 'paiza'), null);
  assert.equal(providerLanguageId('cpp', 'nonsense-provider'), null);
});

test('no provider mapping is marked verified without a real observed execution', () => {
  const verified = listLanguages()
    .flatMap((l) => Object.entries(l.providers).map(([p, m]) => ({ key: l.key, provider: p, m })))
    .filter((x) => x.m.verified)
    .map((x) => `${x.key}/${x.provider}`);
  // Only the three Paiza runtimes have been exercised end to end.
  assert.deepEqual(verified.sort(), ['cpp/paiza', 'javascript/paiza', 'python/paiza']);
});

// ---------------------------------------------------------------------------
// Type capability
// ---------------------------------------------------------------------------

test('dynamically typed languages express every canonical type', () => {
  for (const type of CANONICAL_TYPES) {
    assert.ok(languageSupportsType('javascript', type), `javascript: ${type}`);
    assert.ok(languageSupportsType('python', type), `python: ${type}`);
  }
});

test('typed languages declare every canonical type they claim', () => {
  for (const key of ['cpp', 'java', 'csharp']) {
    for (const type of CANONICAL_TYPES) {
      assert.ok(languageSupportsType(key, type), `${key} should express ${type}`);
      assert.ok(typeDeclaration(key, type)?.decl, `${key}: ${type} needs a decl`);
    }
  }
});

test('C declares every canonical type except the matrix', () => {
  for (const type of CANONICAL_TYPES) {
    const expected = type !== 'vector<vector<int>>';
    assert.equal(languageSupportsType('c', type), expected, `c: ${type}`);
  }
});

test('C array types are marked as needing a length parameter', () => {
  // int* carries no length, so the signature has to supply one -- the same
  // convention LeetCode uses (`int* nums, int numsSize`).
  assert.equal(typeDeclaration('c', 'vector<int>').needsLength, true);
  assert.equal(typeDeclaration('c', 'vector<string>').needsLength, true);
  assert.notEqual(typeDeclaration('c', 'int').needsLength, true);
});

test('a type outside the canonical vocabulary is rejected everywhere', () => {
  for (const def of listLanguages()) {
    assert.equal(languageSupportsType(def.key, 'vector<vector<string>>'), false, def.key);
    assert.equal(languageSupportsType(def.key, 'map<int,int>'), false, def.key);
  }
});

// ---------------------------------------------------------------------------
// Per-problem capability — the point of the registry
// ---------------------------------------------------------------------------

const INT_FROM_VECTOR = { fn: 'rob', args: [{ name: 'nums', type: 'vector<int>' }], ret: 'int' };
const MATRIX_SIGNATURE = {
  fn: 'findMaxValueOfEquation',
  args: [{ name: 'points', type: 'vector<vector<int>>' }, { name: 'k', type: 'int' }],
  ret: 'int',
};

test('a signature is not blanket-supported: C rejects a matrix problem', () => {
  assert.equal(languageSupportsSignature('cpp', MATRIX_SIGNATURE).supported, true);
  assert.equal(languageSupportsSignature('java', MATRIX_SIGNATURE).supported, true);
  assert.equal(languageSupportsSignature('csharp', MATRIX_SIGNATURE).supported, true);

  const c = languageSupportsSignature('c', MATRIX_SIGNATURE);
  assert.equal(c.supported, false);
  assert.match(c.reason, /cannot express vector<vector<int>>/);
});

test('typed languages accept an ordinary signature', () => {
  for (const key of ['cpp', 'java', 'c', 'csharp']) {
    assert.equal(languageSupportsSignature(key, INT_FROM_VECTOR).supported, true, key);
  }
});

test('a typed language refuses a problem with no signature at all', () => {
  const verdict = languageSupportsSignature('java', null);
  assert.equal(verdict.supported, false);
  assert.match(verdict.reason, /needs a signature/);
});

test('dynamically typed languages need no signature', () => {
  assert.equal(languageSupportsSignature('javascript', null).supported, true);
  assert.equal(languageSupportsSignature('python', undefined).supported, true);
});

test('a malformed signature is reported per argument', () => {
  const verdict = languageSupportsSignature('cpp', {
    fn: 'f',
    args: [{ name: 'a', type: 'map<int,int>' }],
    ret: 'int',
  });
  assert.equal(verdict.supported, false);
  assert.match(verdict.reason, /argument "a"/);
});

test('languagesForSignature reports the production set and the reasons against', () => {
  const visible = languagesForSignature(MATRIX_SIGNATURE);
  assert.deepEqual(visible.supported, ['javascript', 'python', 'cpp']);
  assert.deepEqual(visible.unsupported, []);

  const all = languagesForSignature(MATRIX_SIGNATURE, { includeHidden: true });
  assert.deepEqual(all.supported, ['javascript', 'python', 'cpp', 'java', 'csharp']);
  assert.deepEqual(all.unsupported.map((u) => u.key), ['c']);
});

test('run and submit capability is readable per language', () => {
  assert.equal(canRun('cpp'), true);
  assert.equal(canSubmit('cpp'), true);
  assert.equal(canRun('java'), false);
  assert.equal(canSubmit('java'), false);
  assert.equal(canRun('nonsense'), false);
});
