import assert from 'node:assert/strict';
import test from 'node:test';
import { validateServerEnv } from '../../server/config/env.js';

test('server environment requires a database connection string', () => {
  assert.throws(
    () => validateServerEnv({ NODE_ENV: 'test' }),
    /DATABASE_URL or POSTGRES_URL is required/,
  );
});

test('production rejects wildcard CORS', () => {
  assert.throws(
    () => validateServerEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://example.invalid/robinhood',
      CORS_ALLOW_ORIGINS: '*',
    }),
    /explicit CORS allow-list/,
  );
});

test('valid configuration is coerced to bounded numeric values', () => {
  const env = validateServerEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://example.invalid/robinhood',
    PORT: '4000',
    API_RATE_LIMIT_MAX: '75',
  });
  assert.equal(env.PORT, 4000);
  assert.equal(env.API_RATE_LIMIT_MAX, 75);
});
