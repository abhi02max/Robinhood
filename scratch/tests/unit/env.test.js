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

// ---------------------------------------------------------------------------
// Regression: production must not silently accept per-process sessions.
//
// With REDIS_URL unset it defaults to localhost, the connection fails, and
// auth-routes falls back to inMemoryAuthSessions. That was measured to sign a user
// out across a backend restart (200 with a valid token, restart, 401 on the same
// token), and it breaks entirely across replicas because a token issued by one
// process is unknown to the others. Neither symptom shows up in a health check.
// ---------------------------------------------------------------------------

test('production requires an explicit REDIS_URL because sessions live there', () => {
  assert.throws(
    () => validateServerEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://example.invalid/robinhood',
      CORS_ALLOW_ORIGINS: 'https://robinhood.example',
    }),
    /explicit REDIS_URL/,
  );
});

test('production accepts an explicitly provided REDIS_URL', () => {
  const env = validateServerEnv({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://example.invalid/robinhood',
    CORS_ALLOW_ORIGINS: 'https://robinhood.example',
    REDIS_URL: 'redis://cache.example:6379',
  });
  assert.equal(env.REDIS_URL, 'redis://cache.example:6379');
});

test('a single-process deployment can opt in to in-memory sessions explicitly', () => {
  const env = validateServerEnv({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://example.invalid/robinhood',
    CORS_ALLOW_ORIGINS: 'https://robinhood.example',
    ALLOW_IN_MEMORY_SESSIONS: 'true',
  });
  assert.equal(env.ALLOW_IN_MEMORY_SESSIONS, 'true');
});

test('development is unaffected and keeps the localhost Redis default', () => {
  const env = validateServerEnv({
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://example.invalid/robinhood',
  });
  assert.equal(env.REDIS_URL, 'redis://127.0.0.1:6379');
});
