-- =========================================================================
-- DESTRUCTIVE RESET — DROPS ALL LEARNING DATA
-- =========================================================================
-- This is intentionally NOT applied by the bootstrap routine. Run it
-- manually only when you want a clean slate before re-seeding:
--
--   psql "$DATABASE_URL" -f server/schema-leetcode.reset.sql
--   npm run seed:learning
--
-- DDL must run in reverse FK order.
-- =========================================================================

DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS submissions    CASCADE;
DROP TABLE IF EXISTS test_cases     CASCADE;
DROP TABLE IF EXISTS problems       CASCADE;
DROP TABLE IF EXISTS patterns       CASCADE;
DROP TABLE IF EXISTS topics         CASCADE;
