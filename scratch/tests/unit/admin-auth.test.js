import assert from 'node:assert/strict';
import test from 'node:test';
import { requireAdmin } from '../../server/admin-engine/admin-middleware.js';

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('admin middleware rejects a spoofed admin header', async () => {
  let queried = false;
  const middleware = requireAdmin({ query: async () => { queried = true; return { rows: [] }; } });
  const res = createResponse();
  await middleware({ user: null, headers: { 'x-admin-user-id': 'spoofed' } }, res, () => assert.fail('must not call next'));
  assert.equal(res.statusCode, 401);
  assert.equal(queried, false);
});

test('admin middleware accepts a verified session user with an admin role', async () => {
  const middleware = requireAdmin({
    query: async (_sql, params) => {
      assert.deepEqual(params, ['user-1']);
      return { rows: [{ role: 'admin' }] };
    },
  });
  const req = { user: { userId: 'user-1' }, headers: {} };
  const res = createResponse();
  let nextCalled = false;
  await middleware(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.adminRole, 'admin');
});
