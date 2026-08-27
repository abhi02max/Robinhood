const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://robinhood:robinhood@localhost:5433/robinhood' });

(async () => {
  try {
    // Check test_cases columns
    const cols = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='test_cases' ORDER BY ordinal_position`
    );
    console.log('=== test_cases COLUMNS ===');
    cols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

    // Check problems columns  
    const pcols = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='problems' ORDER BY ordinal_position`
    );
    console.log('\n=== problems COLUMNS ===');
    pcols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

    // Sample test cases with correct column names
    const sample = await pool.query(`SELECT * FROM test_cases LIMIT 2`);
    console.log('\n=== SAMPLE test_cases ===');
    sample.rows.forEach((r, i) => console.log(`  Row ${i}:`, JSON.stringify(r).substring(0, 200)));

    // Sample a Two Sum test case
    const twoSum = await pool.query(`SELECT p.title, tc.* FROM test_cases tc JOIN problems p ON tc.problem_id = p.id WHERE p.slug='two-sum' LIMIT 3`);
    console.log('\n=== TWO SUM test_cases ===');
    twoSum.rows.forEach((r, i) => console.log(`  Case ${i}:`, JSON.stringify(r).substring(0, 200)));

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await pool.end();
  }
})();
