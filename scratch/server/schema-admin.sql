-- =========================================================================
-- ROBINHOOD ADMIN DASHBOARD SCHEMA
-- Resources, Company Sets, Admin Access
-- =========================================================================

-- 1. ADMIN USERS — Role-based access control
CREATE TABLE IF NOT EXISTS admin_users (
    user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    role          VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'editor', 'viewer')),
    granted_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RESOURCES — PDFs, YouTube links attached to topics/subtopics
CREATE TABLE IF NOT EXISTS resources (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('pdf', 'youtube', 'article', 'note')),
    title         VARCHAR(500) NOT NULL,
    url           TEXT NOT NULL,
    subject       VARCHAR(255),
    topic         VARCHAR(255),
    subtopic      VARCHAR(255),
    description   TEXT,
    metadata      JSONB DEFAULT '{}',
    uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COMPANY QUESTION SETS — Curated problem collections per company
CREATE TABLE IF NOT EXISTS company_question_sets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name  VARCHAR(255) NOT NULL,
    set_name      VARCHAR(255) NOT NULL,
    description   TEXT,
    problem_ids   TEXT[] NOT NULL DEFAULT '{}',
    difficulty_mix JSONB DEFAULT '{"Easy": 0, "Medium": 0, "Hard": 0}',
    is_active     BOOLEAN DEFAULT TRUE,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ADMIN AUDIT LOG — Track all admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    action        VARCHAR(100) NOT NULL,
    entity_type   VARCHAR(100) NOT NULL,
    entity_id     TEXT,
    details       JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_subject ON resources(subject, topic);
CREATE INDEX IF NOT EXISTS idx_company_sets_company ON company_question_sets(company_name);
CREATE INDEX IF NOT EXISTS idx_admin_audit_user ON admin_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON admin_audit_log(entity_type, entity_id);
