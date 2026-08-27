-- SQL Sandbox hardening bootstrap (run on fresh sql-sandbox-postgres initialization)

CREATE SCHEMA IF NOT EXISTS sandbox_data;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_reader') THEN
    CREATE ROLE sandbox_reader
      LOGIN
      PASSWORD 'sandbox_reader_password'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOREPLICATION;
  END IF;
END $$;

GRANT CONNECT ON DATABASE robinhood_sql_sandbox TO sandbox_reader;
GRANT USAGE ON SCHEMA sandbox_data TO sandbox_reader;

REVOKE ALL ON SCHEMA public FROM sandbox_reader;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM sandbox_reader;
REVOKE ALL ON SCHEMA information_schema FROM sandbox_reader;
REVOKE ALL ON ALL TABLES IN SCHEMA information_schema FROM sandbox_reader;

CREATE TABLE IF NOT EXISTS sandbox_data.departments (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL DEFAULT 'public'
);

CREATE TABLE IF NOT EXISTS sandbox_data.employees (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  department_id INTEGER REFERENCES sandbox_data.departments(id),
  salary NUMERIC(12, 2) NOT NULL,
  owner_id TEXT NOT NULL DEFAULT 'public'
);

CREATE TABLE IF NOT EXISTS sandbox_data.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  owner_id TEXT NOT NULL DEFAULT 'public'
);

CREATE TABLE IF NOT EXISTS sandbox_data.orders (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  product_id INTEGER REFERENCES sandbox_data.products(id),
  quantity INTEGER NOT NULL,
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  owner_id TEXT NOT NULL DEFAULT 'public'
);

CREATE TABLE IF NOT EXISTS sandbox_data.customers (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  city TEXT,
  owner_id TEXT NOT NULL DEFAULT 'public'
);

CREATE TABLE IF NOT EXISTS sandbox_data.sales (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES sandbox_data.customers(id),
  amount NUMERIC(12, 2) NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  owner_id TEXT NOT NULL DEFAULT 'public'
);

INSERT INTO sandbox_data.departments (name, owner_id)
VALUES
  ('Engineering', 'public'),
  ('Analytics', 'public'),
  ('Product', 'public')
ON CONFLICT (name) DO NOTHING;

INSERT INTO sandbox_data.products (name, category, unit_price, owner_id)
VALUES
  ('Notebook', 'Stationery', 12.50, 'public'),
  ('Keyboard', 'Hardware', 79.00, 'public'),
  ('Monitor', 'Hardware', 240.00, 'public')
ON CONFLICT DO NOTHING;

ALTER TABLE sandbox_data.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_data.departments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS departments_isolation ON sandbox_data.departments;
CREATE POLICY departments_isolation ON sandbox_data.departments
  FOR SELECT
  TO sandbox_reader
  USING (
    owner_id = 'public'
    OR owner_id = COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous')
  );

ALTER TABLE sandbox_data.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_data.employees FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employees_isolation ON sandbox_data.employees;
CREATE POLICY employees_isolation ON sandbox_data.employees
  FOR SELECT
  TO sandbox_reader
  USING (
    owner_id = 'public'
    OR owner_id = COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous')
  );

ALTER TABLE sandbox_data.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_data.products FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_isolation ON sandbox_data.products;
CREATE POLICY products_isolation ON sandbox_data.products
  FOR SELECT
  TO sandbox_reader
  USING (
    owner_id = 'public'
    OR owner_id = COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous')
  );

ALTER TABLE sandbox_data.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_data.orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_isolation ON sandbox_data.orders;
CREATE POLICY orders_isolation ON sandbox_data.orders
  FOR SELECT
  TO sandbox_reader
  USING (
    owner_id = 'public'
    OR owner_id = COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous')
  );

ALTER TABLE sandbox_data.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_data.customers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customers_isolation ON sandbox_data.customers;
CREATE POLICY customers_isolation ON sandbox_data.customers
  FOR SELECT
  TO sandbox_reader
  USING (
    owner_id = 'public'
    OR owner_id = COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous')
  );

ALTER TABLE sandbox_data.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_data.sales FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_isolation ON sandbox_data.sales;
CREATE POLICY sales_isolation ON sandbox_data.sales
  FOR SELECT
  TO sandbox_reader
  USING (
    owner_id = 'public'
    OR owner_id = COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous')
  );

GRANT SELECT ON ALL TABLES IN SCHEMA sandbox_data TO sandbox_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA sandbox_data GRANT SELECT ON TABLES TO sandbox_reader;

ALTER ROLE sandbox_reader IN DATABASE robinhood_sql_sandbox SET search_path TO sandbox_data;
ALTER ROLE sandbox_reader IN DATABASE robinhood_sql_sandbox SET default_transaction_read_only = on;
ALTER ROLE sandbox_reader IN DATABASE robinhood_sql_sandbox SET statement_timeout = '8s';
