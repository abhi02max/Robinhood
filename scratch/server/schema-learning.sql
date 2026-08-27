-- ============================================
-- ROBINHOOD LAYER 1 & 2 - CURRICULUM RELATIONAL SCHEMA
-- Subjects -> Topics -> Lessons -> Problems
-- ============================================

CREATE TABLE IF NOT EXISTS learning_subjects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  short_title TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES learning_subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stage TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  estimated_mins INTEGER NOT NULL DEFAULT 18,
  content JSONB NOT NULL,
  ai_contextual_pdf_url TEXT, -- Layer 1: Contextual PDF
  curated_video_links TEXT[], -- Layer 1: Best YT educators
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_lessons (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES learning_subjects(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES learning_topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  objective TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  revision_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  practice_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiz JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extended Layer 2: Problem-Centric Entities
CREATE TABLE IF NOT EXISTS problems (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  category TEXT NOT NULL,
  pattern TEXT, -- e.g., Sliding Window, Two Pointers
  prerequisites TEXT[], -- array of topic/problem IDs
  companies TEXT[], -- array of company names
  time_complexity TEXT,
  space_complexity TEXT,
  blind_spots TEXT[], -- what this problem tests
  common_mistakes TEXT[], -- common candidate mistakes
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topic_problems (
  topic_id TEXT REFERENCES learning_topics(id) ON DELETE CASCADE,
  problem_id TEXT REFERENCES problems(id) ON DELETE CASCADE,
  track_level TEXT CHECK (track_level IN ('Foundation', 'Intermediate', 'Advanced')),
  PRIMARY KEY(topic_id, problem_id)
);

-- Layer 2: 3 different solution approaches (brute -> optimal)
CREATE TABLE IF NOT EXISTS problem_solutions (
  id SERIAL PRIMARY KEY,
  problem_id TEXT REFERENCES problems(id) ON DELETE CASCADE,
  approach_type TEXT CHECK (approach_type IN ('Brute-Force', 'Better', 'Optimal')),
  intuition TEXT NOT NULL,
  time_complexity TEXT,
  space_complexity TEXT,
  code_snippet TEXT NOT NULL,
  language TEXT NOT NULL,
  follow_ups TEXT[], -- Interview follow-up questions for this approach
  order_index INTEGER NOT NULL
);

-- Keep original schema compatibility constraints
CREATE TABLE IF NOT EXISTS lesson_problems (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES learning_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  problem_ref TEXT REFERENCES problems(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_topics_subject ON learning_topics(subject_id, order_index);
CREATE INDEX IF NOT EXISTS idx_learning_lessons_topic ON learning_lessons(topic_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lesson_problems_lesson ON lesson_problems(lesson_id);
CREATE INDEX IF NOT EXISTS idx_topic_problems_topic ON topic_problems(topic_id);
CREATE INDEX IF NOT EXISTS idx_problem_solutions_problem ON problem_solutions(problem_id, order_index);
