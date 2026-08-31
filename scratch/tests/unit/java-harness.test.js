import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildJavaProgram,
  javaLiteral,
  javaStringLiteral,
  renderJavaStarter,
  stripPublicFromTopLevelClasses,
} from '../../server/languages/java.js';

const ROB = { fn: 'rob', class: 'Solution', args: [{ name: 'nums', type: 'vector<int>' }], ret: 'int' };

// ---------------------------------------------------------------------------
// Literals — the design decision. No JSON parser ships in the Java harness, so
// argument correctness is decided entirely here, at generation time.
// ---------------------------------------------------------------------------

test('primitive literals carry the right Java suffixes', () => {
  assert.equal(javaLiteral('int', 42), '42');
  assert.equal(javaLiteral('int', -7), '-7');
  assert.equal(javaLiteral('long long', 5), '5L');
  assert.equal(javaLiteral('bool', true), 'true');
  assert.equal(javaLiteral('bool', false), 'false');
});

test('a whole-number double still renders with a decimal point', () => {
  // `new double[]{5}` compiles, but an integer literal outside int range does not,
  // and mixing `5` with `5.5` in one initialiser reads as a bug.
  assert.equal(javaLiteral('double', 5), '5.0');
  assert.equal(javaLiteral('double', 12.75), '12.75');
  assert.equal(javaLiteral('double', -0.5), '-0.5');
});

test('array literals use the right element type', () => {
  assert.equal(javaLiteral('vector<int>', [1, 2, 3]), 'new int[]{1, 2, 3}');
  assert.equal(javaLiteral('vector<long long>', [1, 2]), 'new long[]{1L, 2L}');
  assert.equal(javaLiteral('vector<double>', [1, 2.5]), 'new double[]{1.0, 2.5}');
  assert.equal(javaLiteral('vector<bool>', [true, false]), 'new boolean[]{true, false}');
  assert.equal(javaLiteral('vector<string>', ['a', 'b']), 'new String[]{"a", "b"}');
});

test('empty arrays render as valid empty initialisers', () => {
  assert.equal(javaLiteral('vector<int>', []), 'new int[]{}');
  assert.equal(javaLiteral('vector<vector<int>>', []), 'new int[][]{}');
  assert.equal(javaLiteral('vector<string>', []), 'new String[]{}');
});

test('a matrix renders as a nested initialiser', () => {
  assert.equal(
    javaLiteral('vector<vector<int>>', [[1, 2], [3, 4]]),
    'new int[][]{{1, 2}, {3, 4}}',
  );
  // Ragged rows are legal in Java and appear in real interval problems.
  assert.equal(javaLiteral('vector<vector<int>>', [[1], [2, 3]]), 'new int[][]{{1}, {2, 3}}');
});

test('string literals are escaped for Java source', () => {
  assert.equal(javaStringLiteral('hello'), '"hello"');
  assert.equal(javaStringLiteral('say "hi"'), '"say \\"hi\\""');
  assert.equal(javaStringLiteral('back\\slash'), '"back\\\\slash"');
  assert.equal(javaStringLiteral('line\nbreak'), '"line\\nbreak"');
  assert.equal(javaStringLiteral('tab\there'), '"tab\\there"');
});

test('non-ASCII is escaped rather than passed through', () => {
  // The source is shipped to a provider whose file encoding we do not control; one
  // mis-decoded byte is a compile error in code the user never wrote.
  assert.equal(javaStringLiteral('café'), '"caf\\u00e9"');
  assert.equal(javaStringLiteral('日本'), '"\\u65e5\\u672c"');
});

test('a value that contradicts its declared type is rejected, not coerced', () => {
  // A wrongly shaped literal is a compile error in generated code, which reads to the
  // user as a platform fault. Better to fail here with the argument named.
  assert.throws(() => javaLiteral('int', 1.5), /expected an integer/);
  assert.throws(() => javaLiteral('int', 'x'), /expected an integer/);
  assert.throws(() => javaLiteral('bool', 1), /expected a boolean/);
  assert.throws(() => javaLiteral('string', 5), /expected a string/);
  assert.throws(() => javaLiteral('vector<int>', 5), /expected an array/);
  assert.throws(() => javaLiteral('vector<int>', [1, 'x']), /nums|\[1\]|expected an integer/);
  assert.throws(() => javaLiteral('double', null), /expected a finite number/);
});

test('a type outside the canonical vocabulary is refused', () => {
  assert.throws(() => javaLiteral('vector<vector<string>>', [[]]), /cannot express/);
});

// ---------------------------------------------------------------------------
// Starter
// ---------------------------------------------------------------------------

test('the starter declares only the method, with no main and no I/O', () => {
  const { code } = renderJavaStarter(ROB);
  assert.match(code, /^class Solution \{/m);
  assert.match(code, /public int rob\(int\[\] nums\) \{/);
  assert.doesNotMatch(code, /main\s*\(/);
  assert.doesNotMatch(code, /Scanner|System\.in|BufferedReader/);
});

test('the untouched starter compiles: every return type has a placeholder', () => {
  // A Java method with a non-void return type and no return statement does not
  // compile, so an empty body would greet the user with an error they did not cause.
  const cases = [
    ['int', 'return 0;'],
    ['long long', 'return 0L;'],
    ['double', 'return 0.0;'],
    ['bool', 'return false;'],
    ['string', 'return "";'],
    ['vector<int>', 'return null;'],
    ['vector<vector<int>>', 'return null;'],
  ];
  for (const [ret, expected] of cases) {
    const { code, error } = renderJavaStarter({ ...ROB, ret });
    assert.equal(error, undefined, `${ret}: ${error}`);
    assert.ok(code.includes(expected), `${ret} should place "${expected}", got:\n${code}`);
  }
});

test('the starter reports a type it cannot express instead of emitting bad Java', () => {
  const { error } = renderJavaStarter({ ...ROB, ret: 'vector<vector<string>>' });
  assert.match(error, /cannot express/);
});

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

test('the harness bakes the arguments in as literals and carries no parser', () => {
  const program = buildJavaProgram('class Solution { public int rob(int[] nums) { return 0; } }', ROB, { nums: [2, 7, 9] });
  assert.match(program, /int\[\] nums = new int\[\]\{2, 7, 9\};/);
  assert.match(program, /public class Main/);
  assert.match(program, /Solution __sol = new Solution\(\);/);
  assert.match(program, /int __out = __sol\.rob\(nums\);/);
  assert.match(program, /<<<OUT>>>/);
  assert.match(program, /<<<END>>>/);
  // No stdin reading anywhere: that is the whole point of the literal design.
  assert.doesNotMatch(program, /Scanner|System\.in|BufferedReader|readAllBytes/);
});

test('the harness targets Java 8 syntax, not Paiza\'s newer runtime', () => {
  // Judge0 CE ships OpenJDK 13; Paiza runs 18. The older compiler is the target.
  const program = buildJavaProgram('class Solution { public int rob(int[] nums) { return 0; } }', ROB, { nums: [1] });
  assert.doesNotMatch(program, /\bvar\s+\w+\s*=/, 'no var declarations');
  assert.doesNotMatch(program, /->\s*\{/, 'no lambdas in the harness');
  assert.doesNotMatch(program, /"""/, 'no text blocks');
  assert.doesNotMatch(program, /\brecord\s+\w+\s*\(/, 'no records');
  assert.doesNotMatch(program, /\.stream\(\)/, 'no streams');
});

test('a public user class is de-publicised rather than rejected', () => {
  // Java allows one public top-level class per file and it must match the filename.
  // The providers compile this as Main.java, so a user's `public class Solution`
  // would fail to compile — and writing it is the habit every tutorial teaches.
  const program = buildJavaProgram(
    'public class Solution { public int rob(int[] nums) { return 0; } }',
    ROB,
    { nums: [1] },
  );
  assert.match(program, /^class Solution \{/m);
  assert.equal((program.match(/public class/g) || []).length, 1, 'only Main stays public');
  assert.match(program, /public class Main/);
});

test('nested public members are left alone', () => {
  // Only top-level declarations are stripped; inside a class `public` is meaningful.
  const stripped = stripPublicFromTopLevelClasses([
    'public class Solution {',
    '    public class Node { }',
    '    public int rob(int[] nums) { return 0; }',
    '}',
  ].join('\n'));
  assert.match(stripped, /^class Solution \{/m);
  assert.match(stripped, /^ {4}public class Node/m);
});

test('a static solution method still works', () => {
  // Calling a static method through an instance is legal Java. Requiring one form or
  // the other would reject a submission over a style choice.
  const program = buildJavaProgram(
    'class Solution { public static int rob(int[] nums) { return 0; } }',
    ROB,
    { nums: [1] },
  );
  assert.match(program, /Solution __sol = new Solution\(\);/);
});

test('every supported argument type reaches the harness as a declaration', () => {
  const sig = {
    fn: 'f',
    class: 'Solution',
    args: [
      { name: 'a', type: 'int' },
      { name: 'b', type: 'string' },
      { name: 'c', type: 'vector<int>' },
      { name: 'd', type: 'vector<string>' },
      { name: 'e', type: 'vector<vector<int>>' },
      { name: 'g', type: 'double' },
      { name: 'h', type: 'bool' },
    ],
    ret: 'vector<int>',
  };
  const program = buildJavaProgram('class Solution { public int[] f(int a, String b, int[] c, String[] d, int[][] e, double g, boolean h) { return null; } }', sig, {
    a: 1, b: 'x', c: [1], d: ['y'], e: [[1]], g: 1.5, h: true,
  });
  assert.match(program, /int a = 1;/);
  assert.match(program, /String b = "x";/);
  assert.match(program, /int\[\] c = new int\[\]\{1\};/);
  assert.match(program, /String\[\] d = new String\[\]\{"y"\};/);
  assert.match(program, /int\[\]\[\] e = new int\[\]\[\]\{\{1\}\};/);
  assert.match(program, /double g = 1.5;/);
  assert.match(program, /boolean h = true;/);
  assert.match(program, /int\[\] __out = __sol\.f\(a, b, c, d, e, g, h\);/);
});

test('a test case missing an argument fails with that argument named', () => {
  assert.throws(
    () => buildJavaProgram('class Solution {}', ROB, { wrongKey: [1] }),
    /missing the argument "nums"/,
  );
});

test('a problem with no signature is refused clearly', () => {
  assert.throws(() => buildJavaProgram('class Solution {}', null, {}), /no signature configured/);
});

test('the serializer refuses a non-finite double at runtime', () => {
  // Emitting NaN would produce invalid JSON and surface as a harness error with no
  // explanation; the generated code throws with the value instead.
  const program = buildJavaProgram('class Solution { public double f(int a) { return 0; } }',
    { fn: 'f', class: 'Solution', args: [{ name: 'a', type: 'int' }], ret: 'double' }, { a: 1 });
  assert.match(program, /Double\.isNaN\(v\) \|\| Double\.isInfinite\(v\)/);
  assert.match(program, /result is not a finite number/);
});
