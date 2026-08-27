-- =========================================================================
-- COMPLETE LEETCODE-LEVEL BACKEND DATA SYSTEM SCHEMA
-- Hierarchy: Topics -> Patterns -> Problems -> Test Cases -> Submissions
-- =========================================================================

-- Idempotent: this file is replayed on every server start by the
-- bootstrap routine, so it must NEVER drop existing data. Use
-- CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS throughout.
--
-- For a destructive reset, run the contents of schema-leetcode.reset.sql
-- manually or use a dedicated migration tool.

-- 1. TOPICS (e.g., Arrays, Dynamic Programming)
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PATTERNS (e.g., Sliding Window, Two Pointers)
CREATE TABLE IF NOT EXISTS patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    explanation TEXT NOT NULL DEFAULT '',
    when_to_use TEXT NOT NULL DEFAULT '',
    intuition TEXT NOT NULL DEFAULT '',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROBLEMS
CREATE TABLE IF NOT EXISTS problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    difficulty VARCHAR(50) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    
    -- Content Structure
    description TEXT NOT NULL,
    examples JSONB NOT NULL DEFAULT '[]', -- [{ input, output, explanation }]
    constraints JSONB NOT NULL DEFAULT '[]', -- [ "N <= 10^5", "A[i] > 0" ]
    edge_cases JSONB NOT NULL DEFAULT '[]',
    starter_code JSONB NOT NULL DEFAULT '{}', -- { "javascript": "function...", "python": "def..." }
    approach_brute TEXT NOT NULL DEFAULT '',
    approach_optimal TEXT NOT NULL DEFAULT '',
    tags TEXT[] NOT NULL DEFAULT '{}',
    
    -- Complexity
    time_complexity VARCHAR(100) NOT NULL,
    space_complexity VARCHAR(100) NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TEST CASES
CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    input_payload JSONB NOT NULL,
    expected_output JSONB NOT NULL,
    is_hidden BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SUBMISSIONS
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Logical FK, since auth might be elsewhere
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    code TEXT NOT NULL,
    status VARCHAR(50) CHECK (status IN ('Pending', 'Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Compilation Error')),
    execution_time_ms INTEGER,
    memory_used_bytes INTEGER,
    pass_count INTEGER DEFAULT 0,
    fail_cases JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. USER PROGRESS
CREATE TABLE IF NOT EXISTS user_progress (
    user_id UUID NOT NULL,
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    status VARCHAR(50) CHECK (status IN ('Attempted', 'Solved')),
    attempts INTEGER DEFAULT 0,
    last_attempted_at TIMESTAMPTZ DEFAULT NOW(),
    solved_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, problem_id)
);

-- =========================================================================
-- INDEXES & PERFORMANCE TUNING
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_patterns_topic       ON patterns(topic_id);
CREATE INDEX IF NOT EXISTS idx_problems_pattern     ON problems(pattern_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_problem   ON test_cases(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user     ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem  ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user   ON user_progress(user_id);
