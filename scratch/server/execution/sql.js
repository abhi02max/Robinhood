// SQL execution (PostgreSQL sandbox)
import { Pool } from 'pg';
import { applyRowLimit, validateSqlQuery } from './sql-policy.js';

function sanitizeIdentifier(value, fallback) {
  const raw = String(value || '').trim().toLowerCase();
  if (/^[a-z_][a-z0-9_]*$/.test(raw)) return raw;
  return fallback;
}

function quoteLiteral(value) {
  return `'${String(value || '').replace(/'/g, "''")}'`;
}

function resolveSqlSandboxUrl() {
  const explicit = process.env.SQL_SANDBOX_URL;
  if (explicit && explicit.trim()) {
    if (process.env.NODE_ENV !== 'production' && explicit.includes('@postgres:')) {
      return explicit.replace('@postgres:', '@127.0.0.1:');
    }
    return explicit;
  }

  const fromDatabaseUrl = process.env.DATABASE_URL;
  if (fromDatabaseUrl && fromDatabaseUrl.trim()) {
    return fromDatabaseUrl;
  }

  return 'postgresql://robinhood:robinhood@127.0.0.1:5432/robinhood';
}

function resolveSqlSandboxAdminUrl(fallbackUrl) {
  const explicit = process.env.SQL_SANDBOX_ADMIN_URL;
  if (explicit && explicit.trim()) {
    if (process.env.NODE_ENV !== 'production' && explicit.includes('@postgres:')) {
      return explicit.replace('@postgres:', '@127.0.0.1:');
    }
    return explicit;
  }

  return fallbackUrl;
}

function resolveDatabaseName(connectionString) {
  try {
    const parsed = new URL(connectionString);
    return sanitizeIdentifier(parsed.pathname.replace(/^\//, ''), 'robinhood_sql_sandbox');
  } catch {
    return 'robinhood_sql_sandbox';
  }
}

const SANDBOX_SCHEMA = sanitizeIdentifier(process.env.SQL_SANDBOX_SCHEMA, 'sandbox_data');
const SANDBOX_READER_ROLE = sanitizeIdentifier(process.env.SQL_SANDBOX_READER_ROLE, 'sandbox_reader');
const SANDBOX_READER_PASSWORD = String(process.env.SQL_SANDBOX_READER_PASSWORD || 'sandbox_reader_password');
const SQL_STATEMENT_TIMEOUT_MS = Math.max(1000, Number(process.env.SQL_SANDBOX_STATEMENT_TIMEOUT_MS || 8000));

const SQL_SANDBOX_URL = resolveSqlSandboxUrl();
const SQL_SANDBOX_ADMIN_URL = resolveSqlSandboxAdminUrl(SQL_SANDBOX_URL);
const SQL_SANDBOX_DB_NAME = resolveDatabaseName(SQL_SANDBOX_ADMIN_URL);

const readerPool = new Pool({
  connectionString: SQL_SANDBOX_URL,
  idleTimeoutMillis: 5000,
  statement_timeout: SQL_STATEMENT_TIMEOUT_MS,
  application_name: 'robinhood-sql-sandbox-reader',
});

const adminPool = new Pool({
  connectionString: SQL_SANDBOX_ADMIN_URL,
  idleTimeoutMillis: 5000,
  statement_timeout: SQL_STATEMENT_TIMEOUT_MS,
  application_name: 'robinhood-sql-sandbox-admin',
});

function getQueryPreview(args = []) {
  const queryText = typeof args[0] === 'string'
    ? args[0]
    : String(args[0]?.text || '');
  return queryText.replace(/\s+/g, ' ').trim().slice(0, 220);
}

function instrumentSandboxPool(pool, label) {
  if (!pool || pool.__sandboxInstrumented) return pool;

  const originalPoolQuery = pool.query.bind(pool);
  pool.query = async (...args) => {
    try {
      return await originalPoolQuery(...args);
    } catch (error) {
      console.error('[Execution SQL][DB QUERY ERROR]', JSON.stringify({
        pool: label,
        source: 'pool',
        code: error?.code || 'UNKNOWN',
        message: String(error?.message || error),
        queryPreview: getQueryPreview(args),
      }));
      throw error;
    }
  };

  const originalConnect = pool.connect.bind(pool);
  pool.connect = async (...args) => {
    const client = await originalConnect(...args);
    if (!client || client.__sandboxInstrumentedClient) return client;

    const originalClientQuery = client.query.bind(client);
    client.query = async (...queryArgs) => {
      try {
        return await originalClientQuery(...queryArgs);
      } catch (error) {
        console.error('[Execution SQL][DB QUERY ERROR]', JSON.stringify({
          pool: label,
          source: 'client',
          code: error?.code || 'UNKNOWN',
          message: String(error?.message || error),
          queryPreview: getQueryPreview(queryArgs),
        }));
        throw error;
      }
    };

    client.__sandboxInstrumentedClient = true;
    return client;
  };

  pool.__sandboxInstrumented = true;
  return pool;
}

instrumentSandboxPool(readerPool, 'reader');
instrumentSandboxPool(adminPool, 'admin');

let bootstrapPromise = null;
let sandboxRoleMode = 'strict';

function isRolePermissionError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (!message) return false;
  return (
    message.includes('permission denied to create role')
    || message.includes('must be superuser to create roles')
    || message.includes('permission denied to alter role')
    || message.includes('permission denied to grant role')
  );
}

async function ensureSandboxTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SANDBOX_SCHEMA}.departments (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      owner_id TEXT NOT NULL DEFAULT 'public'
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SANDBOX_SCHEMA}.employees (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      department_id INTEGER REFERENCES ${SANDBOX_SCHEMA}.departments(id),
      salary NUMERIC(12,2) NOT NULL,
      owner_id TEXT NOT NULL DEFAULT 'public'
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SANDBOX_SCHEMA}.products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit_price NUMERIC(12,2) NOT NULL,
      owner_id TEXT NOT NULL DEFAULT 'public'
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SANDBOX_SCHEMA}.orders (
      id SERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      product_id INTEGER REFERENCES ${SANDBOX_SCHEMA}.products(id),
      quantity INTEGER NOT NULL,
      ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      owner_id TEXT NOT NULL DEFAULT 'public'
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SANDBOX_SCHEMA}.customers (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      city TEXT,
      owner_id TEXT NOT NULL DEFAULT 'public'
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SANDBOX_SCHEMA}.sales (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES ${SANDBOX_SCHEMA}.customers(id),
      amount NUMERIC(12,2) NOT NULL,
      sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
      owner_id TEXT NOT NULL DEFAULT 'public'
    )
  `);

  await client.query(`
    INSERT INTO ${SANDBOX_SCHEMA}.departments (name, owner_id)
    VALUES
      ('Engineering', 'public'),
      ('Analytics', 'public'),
      ('Product', 'public')
    ON CONFLICT (name) DO NOTHING
  `);

  await client.query(`
    INSERT INTO ${SANDBOX_SCHEMA}.products (name, category, unit_price, owner_id)
    VALUES
      ('Notebook', 'Stationery', 12.50, 'public'),
      ('Keyboard', 'Hardware', 79.00, 'public'),
      ('Monitor', 'Hardware', 240.00, 'public')
    ON CONFLICT DO NOTHING
  `);
}

function normalizeUserContext(userId) {
  const raw = String(userId || 'anonymous').trim().slice(0, 64);
  if (/^[a-zA-Z0-9_-]+$/.test(raw)) return raw;
  return 'anonymous';
}

async function ensureSqlSandboxBootstrap() {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    let client = null;

    try {
      client = await adminPool.connect();
      await client.query('BEGIN');

      await client.query(`CREATE SCHEMA IF NOT EXISTS ${SANDBOX_SCHEMA}`);

      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${quoteLiteral(SANDBOX_READER_ROLE)}) THEN
            CREATE ROLE ${SANDBOX_READER_ROLE}
              LOGIN
              PASSWORD ${quoteLiteral(SANDBOX_READER_PASSWORD)}
              NOSUPERUSER
              NOCREATEDB
              NOCREATEROLE
              NOINHERIT
              NOREPLICATION;
          ELSE
            ALTER ROLE ${SANDBOX_READER_ROLE}
              WITH LOGIN
              PASSWORD ${quoteLiteral(SANDBOX_READER_PASSWORD)}
              NOSUPERUSER
              NOCREATEDB
              NOCREATEROLE
              NOINHERIT
              NOREPLICATION;
          END IF;
        END $$;
      `);

      await client.query(`GRANT CONNECT ON DATABASE ${SQL_SANDBOX_DB_NAME} TO ${SANDBOX_READER_ROLE}`);
      await client.query(`GRANT USAGE ON SCHEMA ${SANDBOX_SCHEMA} TO ${SANDBOX_READER_ROLE}`);
      await client.query(`REVOKE ALL ON SCHEMA public FROM ${SANDBOX_READER_ROLE}`);
      await client.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${SANDBOX_READER_ROLE}`);
      await client.query(`REVOKE ALL ON SCHEMA information_schema FROM ${SANDBOX_READER_ROLE}`);
      await client.query(`REVOKE ALL ON ALL TABLES IN SCHEMA information_schema FROM ${SANDBOX_READER_ROLE}`);

      await ensureSandboxTables(client);

      await client.query(`
        ALTER TABLE ${SANDBOX_SCHEMA}.departments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${SANDBOX_SCHEMA}.departments FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS departments_isolation ON ${SANDBOX_SCHEMA}.departments;
        CREATE POLICY departments_isolation ON ${SANDBOX_SCHEMA}.departments
          FOR SELECT
          TO ${SANDBOX_READER_ROLE}
          USING (
            owner_id = 'public'
            OR owner_id = COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous')
          )
      `);

      await client.query(`
        ALTER TABLE ${SANDBOX_SCHEMA}.employees ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${SANDBOX_SCHEMA}.employees FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS employees_isolation ON ${SANDBOX_SCHEMA}.employees;
        CREATE POLICY employees_isolation ON ${SANDBOX_SCHEMA}.employees
          FOR SELECT
          TO ${SANDBOX_READER_ROLE}
          USING (
            owner_id = 'public'
            OR owner_id = COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous')
          )
      `);

      await client.query(`
        ALTER TABLE ${SANDBOX_SCHEMA}.products ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${SANDBOX_SCHEMA}.products FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS products_isolation ON ${SANDBOX_SCHEMA}.products;
        CREATE POLICY products_isolation ON ${SANDBOX_SCHEMA}.products
          FOR SELECT
          TO ${SANDBOX_READER_ROLE}
          USING (
            owner_id = 'public'
            OR owner_id = COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous')
          )
      `);

      await client.query(`
        ALTER TABLE ${SANDBOX_SCHEMA}.orders ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${SANDBOX_SCHEMA}.orders FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS orders_isolation ON ${SANDBOX_SCHEMA}.orders;
        CREATE POLICY orders_isolation ON ${SANDBOX_SCHEMA}.orders
          FOR SELECT
          TO ${SANDBOX_READER_ROLE}
          USING (
            owner_id = 'public'
            OR owner_id = COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous')
          )
      `);

      await client.query(`
        ALTER TABLE ${SANDBOX_SCHEMA}.customers ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${SANDBOX_SCHEMA}.customers FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS customers_isolation ON ${SANDBOX_SCHEMA}.customers;
        CREATE POLICY customers_isolation ON ${SANDBOX_SCHEMA}.customers
          FOR SELECT
          TO ${SANDBOX_READER_ROLE}
          USING (
            owner_id = 'public'
            OR owner_id = COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous')
          )
      `);

      await client.query(`
        ALTER TABLE ${SANDBOX_SCHEMA}.sales ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${SANDBOX_SCHEMA}.sales FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS sales_isolation ON ${SANDBOX_SCHEMA}.sales;
        CREATE POLICY sales_isolation ON ${SANDBOX_SCHEMA}.sales
          FOR SELECT
          TO ${SANDBOX_READER_ROLE}
          USING (
            owner_id = 'public'
            OR owner_id = COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous')
          )
      `);

      await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA ${SANDBOX_SCHEMA} TO ${SANDBOX_READER_ROLE}`);
      await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${SANDBOX_SCHEMA} GRANT SELECT ON TABLES TO ${SANDBOX_READER_ROLE}`);
      await client.query(`ALTER ROLE ${SANDBOX_READER_ROLE} IN DATABASE ${SQL_SANDBOX_DB_NAME} SET search_path TO ${SANDBOX_SCHEMA}`);
      await client.query(`ALTER ROLE ${SANDBOX_READER_ROLE} IN DATABASE ${SQL_SANDBOX_DB_NAME} SET default_transaction_read_only = on`);
      await client.query(`ALTER ROLE ${SANDBOX_READER_ROLE} IN DATABASE ${SQL_SANDBOX_DB_NAME} SET statement_timeout = '8s'`);

      await client.query('COMMIT');
      sandboxRoleMode = 'strict';
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});

      if (isRolePermissionError(error)) {
        console.warn('[Execution SQL] CREATE/ALTER ROLE not permitted. Falling back to no-role sandbox mode.');
        let fallbackClient = client;

        try {
          if (!fallbackClient) fallbackClient = await adminPool.connect();
          await fallbackClient.query('BEGIN');
          await fallbackClient.query(`CREATE SCHEMA IF NOT EXISTS ${SANDBOX_SCHEMA}`);
          await ensureSandboxTables(fallbackClient);
          await fallbackClient.query('COMMIT');
          sandboxRoleMode = 'no-role';
          return;
        } catch (fallbackError) {
          if (fallbackClient) {
            await fallbackClient.query('ROLLBACK').catch(() => {});
          }
          throw fallbackError;
        } finally {
          if (fallbackClient) fallbackClient.release();
          client = null;
        }
      }
      throw error;
    } finally {
      if (client) client.release();
    }
  })().catch((error) => {
    bootstrapPromise = null;
    throw error;
  });

  return bootstrapPromise;
}

export async function runQuery({ query, userId }) {
  let validatedQuery;
  try {
    validatedQuery = validateSqlQuery(query);
  } catch (error) {
    return { rows: [], fields: [], executionTime: 0, error: String(error?.message || 'Query blocked by SQL sandbox policy.') };
  }

  const safeQuery = applyRowLimit(validatedQuery);

  // Ensure hardened schema/role isolation is in place before execution.
  await ensureSqlSandboxBootstrap();

  const activePool = sandboxRoleMode === 'strict' ? readerPool : adminPool;

  let client = null;
  try {
    client = await activePool.connect();
    await client.query('BEGIN');
    await client.query(`SET LOCAL search_path TO ${SANDBOX_SCHEMA}`);
    if (sandboxRoleMode === 'strict') {
      await client.query("SELECT set_config('app.user_id', $1, true)", [normalizeUserContext(userId)]);
    }
    await client.query('SET LOCAL default_transaction_read_only = on');

    const start = Date.now();
    const result = await client.query(safeQuery);
    const executionTime = Date.now() - start;

    await client.query('COMMIT');
    return {
      rows: result.rows,
      fields: result.fields?.map((field) => field.name),
      executionTime,
    };
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }

    console.error('[Execution SQL] Query failed', JSON.stringify({
      code: error?.code || null,
      message: error?.message || 'Unknown SQL error',
      queryPreview: safeQuery.slice(0, 220),
    }));
    throw error;
  } finally {
    if (client) client.release();
  }
}

export default { runQuery };
