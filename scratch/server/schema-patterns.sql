-- =========================================================================
-- ROBINHOOD PATTERN LEARNING SYSTEM SCHEMA
-- Patterns as intelligent learning modules with staged progression
-- =========================================================================

-- 1. PATTERN MODULES — Rich learning entities (replaces thin patterns table)
CREATE TABLE IF NOT EXISTS pattern_modules (
    id               TEXT PRIMARY KEY,
    topic_id         TEXT NOT NULL,               -- maps to category id (e.g. 'arrays', 'sliding-window')
    name             VARCHAR(255) NOT NULL,
    slug             VARCHAR(255) UNIQUE NOT NULL,
    icon             VARCHAR(100),
    color            VARCHAR(20),

    -- Rich Learning Content
    definition       TEXT NOT NULL,               -- What is this pattern?
    when_to_use      TEXT NOT NULL,               -- Recognition signals
    intuition        TEXT NOT NULL,               -- Core mental model
    visual_steps     JSONB NOT NULL DEFAULT '[]', -- [{step, title, description, diagram_key}]
    common_mistakes  JSONB NOT NULL DEFAULT '[]', -- [{mistake, why, fix}]
    key_indicators   JSONB DEFAULT '[]',          -- Recognition phrases from problem statements
    time_complexity  VARCHAR(100),
    space_complexity VARCHAR(100),

    order_index      INTEGER DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PATTERN STAGES — 5-stage learning path per pattern
CREATE TABLE IF NOT EXISTS pattern_stages (
    id               TEXT PRIMARY KEY,
    pattern_id       TEXT NOT NULL REFERENCES pattern_modules(id) ON DELETE CASCADE,
    stage_number     INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 5),
    title            VARCHAR(255) NOT NULL,
    description      TEXT NOT NULL,
    unlock_criteria  JSONB DEFAULT '{}',          -- {min_solved: N, prev_stage_pct: N}

    UNIQUE(pattern_id, stage_number)
);

-- 3. PATTERN PROBLEMS — Problem-to-pattern mapping with ordering and prerequisites
CREATE TABLE IF NOT EXISTS pattern_problems (
    pattern_id       TEXT NOT NULL REFERENCES pattern_modules(id) ON DELETE CASCADE,
    problem_id       TEXT NOT NULL,               -- maps to problems.id from problems-part*.js
    stage_number     INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 5),
    order_index      INTEGER NOT NULL DEFAULT 0,  -- position within stage
    prerequisites    TEXT[] DEFAULT '{}',          -- array of problem_ids to solve first

    PRIMARY KEY(pattern_id, problem_id)
);

-- 4. USER PATTERN PROGRESS — Per-user per-pattern learning state
CREATE TABLE IF NOT EXISTS user_pattern_progress (
    user_id          TEXT NOT NULL,
    pattern_id       TEXT NOT NULL REFERENCES pattern_modules(id) ON DELETE CASCADE,
    current_stage    INTEGER DEFAULT 1,
    concept_learned  BOOLEAN DEFAULT FALSE,       -- Stage 1 completed
    problems_solved  JSONB DEFAULT '{}',          -- {problem_id: {solved_at, attempts, time_ms}}
    stage_scores     JSONB DEFAULT '{}',          -- {1: 100, 2: 60, ...}
    weak_signals     JSONB DEFAULT '[]',          -- detected weak points
    last_active_at   TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY(user_id, pattern_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_pattern_modules_topic ON pattern_modules(topic_id);
CREATE INDEX IF NOT EXISTS idx_pattern_modules_order ON pattern_modules(order_index);
CREATE INDEX IF NOT EXISTS idx_pattern_stages_pattern ON pattern_stages(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_problems_pattern ON pattern_problems(pattern_id, stage_number);
CREATE INDEX IF NOT EXISTS idx_pattern_problems_problem ON pattern_problems(problem_id);
CREATE INDEX IF NOT EXISTS idx_user_pattern_progress_user ON user_pattern_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pattern_progress_pattern ON user_pattern_progress(pattern_id);
