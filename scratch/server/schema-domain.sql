-- Domain Models Schema for Robinhood Antigravity Platform

CREATE TABLE IF NOT EXISTS subject_tree (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    chapter VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    subtopic VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    subject VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS youtube_links (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    video_url TEXT NOT NULL,
    title VARCHAR(255),
    company_tag VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduler_tasks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    subject VARCHAR(255) NOT NULL,
    mastery_percentage INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mock_interviews (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    session_type VARCHAR(50) NOT NULL,
    company VARCHAR(100),
    transcript JSONB,
    ai_feedback JSONB,
    score INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schema_version (
    version INT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_version(version)
VALUES (1)
ON CONFLICT DO NOTHING;
