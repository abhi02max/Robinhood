-- DB migrations for execution backbone

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  verdict TEXT,
  runtime_ms INTEGER,
  memory_kb INTEGER,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execution results table
CREATE TABLE IF NOT EXISTS execution_results (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(id),
  output TEXT,
  error TEXT,
  execution_time_ms INTEGER,
  memory_kb INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SQL queries table
CREATE TABLE IF NOT EXISTS sql_queries (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  result JSONB,
  error TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id SERIAL PRIMARY KEY,
  problem_id TEXT NOT NULL,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE
);

-- Custom test cases table
CREATE TABLE IF NOT EXISTS custom_test_cases (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  input TEXT NOT NULL,
  expected_output TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
