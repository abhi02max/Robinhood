-- =========================================================================
-- ROBINHOOD POSTGRESQL PRIMARY SCHEMA DEFINITION (CORE LEARNING)
-- Strict Hierarchy: Topics -> Patterns -> Problems -> Test Cases -> Submissions
-- =========================================================================

-- 1. TOPICS (Highest Level, e.g., "Arrays & Hashing")
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PATTERNS (Linked to Topics, e.g., "Sliding Window")
CREATE TABLE IF NOT EXISTS patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROBLEMS (Linked to Patterns)
CREATE TABLE IF NOT EXISTS problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    difficulty VARCHAR(50) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    
    -- Content Structure
    description TEXT NOT NULL,
    examples JSONB NOT NULL DEFAULT '[]', -- Structured [{ input, output, explanation }]
    constraints JSONB NOT NULL DEFAULT '[]', -- Array of strings
    edge_cases JSONB DEFAULT '[]', -- Array of strings
    
    -- Approaches
    approach_brute TEXT,
    approach_optimal TEXT,
    time_complexity VARCHAR(100),
    space_complexity VARCHAR(100),

    -- C++ harness opt-in. When non-null, the problem-aware execution path
    -- (server/execution/execution-service.js) accepts C++ submissions and the
    -- engine generates a typed wrapper around the user's code. When null,
    -- C++ submissions for this problem return "C++ not supported".
    -- Shape:
    --   { "fn": "maxSubArray",
    --     "class": "Solution",                       -- optional
    --     "args": [{ "name": "nums", "type": "vector<int>" }],
    --     "ret":  "int" }
    cpp_signature JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PROBLEM TAGS (For filtering, excluding pattern since it's a strict FK now)
CREATE TABLE IF NOT EXISTS problem_tags (
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    tag_type VARCHAR(50) CHECK (tag_type IN ('Company', 'Concept')),
    tag_value VARCHAR(255) NOT NULL,
    PRIMARY KEY (problem_id, tag_type, tag_value)
);

-- 5. TEST CASES (Support for 50+ per problem)
CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    input_payload JSONB NOT NULL,
    expected_output JSONB NOT NULL,
    is_hidden BOOLEAN DEFAULT TRUE, -- Hidden by default for judging
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SUBMISSIONS
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Assumes users table exists from schema-auth.sql
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    code TEXT NOT NULL,
    status VARCHAR(50) CHECK (status IN ('Pending', 'Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Compilation Error')),
    execution_time_ms INTEGER,
    memory_used_bytes INTEGER,
    failed_test_case_id UUID REFERENCES test_cases(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. USER PROGRESS
CREATE TABLE IF NOT EXISTS user_progress (
    user_id UUID NOT NULL,
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    status VARCHAR(50) CHECK (status IN ('Attempted', 'Solved')),
    attempts INTEGER DEFAULT 0,
    last_attempted_at TIMESTAMPTZ DEFAULT NOW(),
    solved_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, problem_id)
);

-- 8. NOTES (Secondary Priority)
CREATE TABLE IF NOT EXISTS user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    content TEXT, -- Plain text or markdown, no CRDT
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patterns_topic ON patterns(topic_id);
CREATE INDEX IF NOT EXISTS idx_problems_pattern ON problems(pattern_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_problem ON test_cases(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem ON submissions(problem_id);

-- Schema alignment: ensure submissions has execution-engine columns regardless
-- of which schema file (master vs leetcode) created the table first.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS pass_count INTEGER DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS fail_cases JSONB DEFAULT '[]';

-- Partial index: accelerates visible-only test-case fetch (Run path)
CREATE INDEX IF NOT EXISTS idx_test_cases_problem_visible
  ON test_cases(problem_id, order_index) WHERE is_hidden = false;

CREATE TABLE IF NOT EXISTS user_solved_problems (
    user_id UUID NOT NULL,
    problem_slug VARCHAR(255) NOT NULL,
    solved_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, problem_slug)
);

-- Phase 6: Intelligence Layer — pattern prerequisites for learning path graph
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS prerequisites JSONB DEFAULT '[]';
-- Array of pattern slugs that should be mastered before this pattern.
-- Example: '["two-pointers", "hash-map"]'

ALTER TABLE patterns ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS when_to_use TEXT;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS intuition TEXT;
