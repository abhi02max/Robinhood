import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { validateProblemBundle } from '../../server/scripts/validate-problem-schema.js';

const fixturePath = new URL('../../server/data/learning/problems/arrays/kadane-maximum-subarray.json', import.meta.url);

test('v2 problem schema accepts the execution engine cpp_signature contract', async () => {
  const bundle = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
  const result = validateProblemBundle(bundle, 'kadane-fixture');
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('v2 problem schema rejects malformed cpp_signature arguments', async () => {
  const bundle = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
  bundle.problems[0].cpp_signature.args = [{ name: 'nums' }];
  const result = validateProblemBundle(bundle, 'kadane-fixture');
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /cpp_signature\.args\[0\]\.type/);
});
