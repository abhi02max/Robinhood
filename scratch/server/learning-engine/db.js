/**
 * Singleton PostgreSQL pool for the learning engine.
 *
 * IMPORTANT: in ESM, all `import` statements are evaluated BEFORE the
 * module's top-level code runs. `server/index.js` calls `dotenv.config()`
 * after its imports — which means any module that builds its DB pool at
 * import time would read an empty `process.env` and fall back to wrong
 * defaults (#28P01 auth_failed for user "postgres").
 *
 * To make this robust regardless of import order, the pool is created
 * **lazily** on first use, and we expose a Proxy whose method calls
 * (`pool.query(...)`, `pool.connect()`, etc.) all flow through to the
 * real pool. Repo code stays as `pool.query(...)` — no API changes.
 */

import { Pool } from 'pg';

let _pool = null;

/**
 * Build a connection string from whatever env vars are available.
 * Precedence:
 *   1. DATABASE_URL / POSTGRES_URL (set by .env.local in this repo)
 *   2. Discrete POSTGRES_* vars (matches docker-compose defaults)
 *   3. Hardcoded fallback aligned with the project's docker setup.
 */
function buildConnectionString() {
  const direct = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (direct && direct.trim()) return direct.trim();

  const user     = process.env.POSTGRES_USER     || 'robinhood';
  const password = process.env.POSTGRES_PASSWORD || 'robinhood';
  const host     = process.env.POSTGRES_HOST     || '127.0.0.1';
  const port     = process.env.POSTGRES_PORT     || '5433';
  const database = process.env.POSTGRES_DB       || 'robinhood';

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  return `postgresql://${u}:${p}@${host}:${port}/${database}`;
}

function createPool() {
  const connectionString = buildConnectionString();
  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.LEARNING_PG_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on('error', (err) => {
    // Don't crash the process on transient idle-client errors.
    console.error('[learning-engine] idle pool client error:', err?.message || err);
  });

  return pool;
}

function getPool() {
  if (_pool === null) {
    _pool = createPool();
  }
  return _pool;
}

/**
 * Proxy object that defers pool construction until the first method call.
 * Repo code keeps using `pool.query(...)` exactly as before; the real Pool
 * is only built after env vars have been loaded by the top-level entry
 * point (server/index.js, scripts/seed-learning.js, etc.).
 */
const pool = new Proxy(
  {},
  {
    get(_target, prop) {
      const real = getPool();
      const value = real[prop];
      return typeof value === 'function' ? value.bind(real) : value;
    },
  }
);

export default pool;
