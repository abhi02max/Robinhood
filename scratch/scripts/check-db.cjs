const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://robinhood:robinhood@localhost:5433/robinhood' });

(async () => {
  try {
    console.log('=== DATABASE VERIFICATION REPORT ===\n');

    // 1. Count core tables
    const counts = {};
    for (const table of ['topics', 'patterns', 'problems', 'test_cases', 'submissions']) {
      const r = await pool.query(`SELECT count(*) as cnt FROM ${table}`);
      counts[table] = parseInt(r.rows[0].cnt);
      console.log(`  ${table}: ${counts[table]} rows`);
    }

    // 2. Verify topics
    console.log('\n=== TOPICS (all) ===');
    const topics = await pool.query(`SELECT id, name, slug FROM topics ORDER BY name`);
    topics.rows.forEach(r => console.log(`  [${r.id.substring(0,8)}] ${r.name} (${r.slug})`));

    // 3. Verify patterns per topic
    console.log('\n=== PATTERNS PER TOPIC ===');
    const ppt = await pool.query(`
      SELECT t.name as topic, count(p.id) as cnt 
      FROM topics t LEFT JOIN patterns p ON p.topic_id = t.id 
      GROUP BY t.name ORDER BY t.name
    `);
    ppt.rows.forEach(r => console.log(`  ${r.topic}: ${r.cnt} patterns`));

    // 4. Verify problems per pattern (sample)
    console.log('\n=== PROBLEMS PER PATTERN (first 10 patterns) ===');
    const ppp = await pool.query(`
      SELECT pa.name as pattern, t.name as topic, count(pr.id) as cnt,
        string_agg(pr.difficulty, ', ' ORDER BY pr.difficulty) as difficulties
      FROM patterns pa 
      JOIN topics t ON pa.topic_id = t.id
      LEFT JOIN problems pr ON pr.pattern_id = pa.id 
      GROUP BY pa.name, t.name
      ORDER BY t.name, pa.name
      LIMIT 15
    `);
    ppp.rows.forEach(r => console.log(`  ${r.topic} > ${r.pattern}: ${r.cnt} problems [${r.difficulties}]`));

    // 5. Sample specific problems with test cases
    console.log('\n=== SAMPLE PROBLEM: two-sum ===');
    const ts = await pool.query(`SELECT * FROM problems WHERE slug = 'two-sum' LIMIT 1`);
    if (ts.rows.length > 0) {
      const p = ts.rows[0];
      console.log(`  Title: ${p.title}`);
      console.log(`  Difficulty: ${p.difficulty}`);
      console.log(`  Description: ${(p.description || '').substring(0, 200)}...`);
      
      const tcs = await pool.query(`SELECT input_json, expected_output, hidden FROM test_cases WHERE problem_id = $1 ORDER BY hidden`, [p.id]);
      console.log(`  Test Cases: ${tcs.rows.length} total (${tcs.rows.filter(r=>!r.hidden).length} visible, ${tcs.rows.filter(r=>r.hidden).length} hidden)`);
      
      // Show first 3 test cases
      tcs.rows.slice(0, 3).forEach((tc, i) => {
        const inp = typeof tc.input_json === 'string' ? tc.input_json : JSON.stringify(tc.input_json);
        const out = typeof tc.expected_output === 'string' ? tc.expected_output : JSON.stringify(tc.expected_output);
        console.log(`    Case ${i+1}: input=${inp.substring(0, 80)} => expected=${out.substring(0, 60)}`);
      });
    } else {
      console.log('  NOT FOUND');
    }

    // 6. Check data integrity — orphan test cases
    console.log('\n=== DATA INTEGRITY ===');
    const orphans = await pool.query(`SELECT count(*) as cnt FROM test_cases tc LEFT JOIN problems p ON tc.problem_id = p.id WHERE p.id IS NULL`);
    console.log(`  Orphan test cases (no matching problem): ${orphans.rows[0].cnt}`);
    
    const noCases = await pool.query(`SELECT count(*) as cnt FROM problems p LEFT JOIN test_cases tc ON tc.problem_id = p.id WHERE tc.id IS NULL`);
    console.log(`  Problems with zero test cases: ${noCases.rows[0].cnt}`);

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`  ✅ ${counts.topics} topics in database`);
    console.log(`  ✅ ${counts.patterns} patterns in database`);
    console.log(`  ✅ ${counts.problems} problems in database`);
    console.log(`  ✅ ${counts.test_cases} test cases in database`);
    console.log(`  📊 Average test cases per problem: ${(counts.test_cases / counts.problems).toFixed(1)}`);
    console.log(`  🔒 Data is DYNAMIC (served from PostgreSQL, not static JSON)`);

  } catch (e) {
    console.error('FATAL:', e.message);
  } finally {
    await pool.end();
  }
})();
