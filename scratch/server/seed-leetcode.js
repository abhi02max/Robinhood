/**
 * seed-leetcode.js — Seeds real curated problems with proper test cases.
 * Usage: node server/seed-leetcode.js
 */
import pkg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { TOPICS_DATA, PROBLEMS } from './data/real-problems.js';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'robinhood'}:${process.env.POSTGRES_PASSWORD || 'robinhood'}@${process.env.POSTGRES_HOST || '127.0.0.1'}:${process.env.POSTGRES_PORT || '5433'}/${process.env.POSTGRES_DB || 'robinhood'}`;

const pool = new Pool({ connectionString });

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function seedDatabase() {
  console.log('Seeding real curated problems...\n');
  const client = await pool.connect();
  let topicCount = 0, patternCount = 0, problemCount = 0, testCaseCount = 0;

  try {
    await client.query('BEGIN');

    // Build topic map
    const topicMap = {};
    for (let t = 0; t < TOPICS_DATA.length; t++) {
      const topic = TOPICS_DATA[t];
      const topicSlug = slugify(topic.name);
      const res = await client.query(
        `INSERT INTO topics (id, name, slug, description, order_index)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
         RETURNING id`,
        [uuidv4(), topic.name, topicSlug, topic.description, t]
      );
      topicMap[topic.name] = res.rows[0].id;
      topicCount++;
      console.log(`  topic: ${topic.name}`);
    }

    // Build pattern map
    const patternMap = {};
    for (const prob of PROBLEMS) {
      const key = `${prob.topic}::${prob.pattern}`;
      if (patternMap[key]) continue;
      const topicId = topicMap[prob.topic];
      if (!topicId) { console.warn(`  SKIP pattern "${prob.pattern}" — topic "${prob.topic}" not found`); continue; }
      const patternSlug = slugify(prob.pattern);
      const res = await client.query(
        `INSERT INTO patterns (id, topic_id, name, slug, description, order_index)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [uuidv4(), topicId, prob.pattern, patternSlug, `Master the ${prob.pattern} pattern.`, patternCount]
      );
      patternMap[key] = res.rows[0].id;
      patternCount++;
    }

    // Insert problems + test cases
    for (const prob of PROBLEMS) {
      const patternId = patternMap[`${prob.topic}::${prob.pattern}`];
      if (!patternId) continue;

      const probRes = await client.query(
        `INSERT INTO problems
          (id, pattern_id, title, slug, difficulty, description,
           examples, constraints, starter_code,
           time_complexity, space_complexity, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (slug) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           examples = EXCLUDED.examples,
           constraints = EXCLUDED.constraints,
           starter_code = EXCLUDED.starter_code,
           time_complexity = EXCLUDED.time_complexity,
           space_complexity = EXCLUDED.space_complexity
         RETURNING id`,
        [
          uuidv4(), patternId, prob.title, prob.slug, prob.difficulty,
          prob.description,
          JSON.stringify(prob.examples),
          JSON.stringify(prob.constraints),
          JSON.stringify(prob.starter_code),
          prob.time_complexity, prob.space_complexity,
          [prob.topic, prob.pattern],
        ]
      );
      const realProblemId = probRes.rows[0].id;
      problemCount++;
      console.log(`    problem: ${prob.title} (${prob.difficulty})`);

      // Wipe + re-insert test cases
      await client.query(`DELETE FROM test_cases WHERE problem_id = $1`, [realProblemId]);
      for (let j = 0; j < prob.test_cases.length; j++) {
        const tc = prob.test_cases[j];
        await client.query(
          `INSERT INTO test_cases (problem_id, input_payload, expected_output, is_hidden, order_index)
           VALUES ($1, $2, $3, $4, $5)`,
          [realProblemId, JSON.stringify(tc.input), JSON.stringify(tc.expected), tc.hidden, j]
        );
        testCaseCount++;
      }
    }

    await client.query('COMMIT');
    console.log(`\nSEED COMPLETE: ${topicCount} topics, ${patternCount} patterns, ${problemCount} problems, ${testCaseCount} test cases`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\nSEED FAILED:', err.message);
    if (err.detail) console.error('detail:', err.detail);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
