// ============================================
// SQL ENGINE — Client-side SQLite via sql.js
// WASM-powered execution + robust validation
// ============================================

let _SQL = null;
let _loadPromise = null;

/**
 * Initialize sql.js WASM engine (loads once, caches).
 * Returns the SQL.js module constructor.
 */
export async function initSqlEngine() {
  if (_SQL) return _SQL;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      // Try loading from CDN
      const cdnUrl = 'https://sql.js.org/dist/sql-wasm.js';
      const script = document.createElement('script');
      script.src = cdnUrl;

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      // eslint-disable-next-line no-undef
      const SQL = await window.initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`,
      });

      _SQL = SQL;
      return SQL;
    } catch (err) {
      console.error('[SQL Engine] Failed to load sql.js:', err);
      _loadPromise = null;
      throw new Error('Could not load SQL engine. Check your internet connection.');
    }
  })();

  return _loadPromise;
}

/**
 * Execute a user query against a schema.
 * @param {string} schemaSQL - CREATE TABLE + INSERT statements to seed the DB
 * @param {string} userQuery - The user's SQL query
 * @returns {{ columns: string[], rows: any[][], executionTimeMs: number, error: string|null }}
 */
export function executeQuery(SQL, schemaSQL, userQuery) {
  let db = null;
  try {
    db = new SQL.Database();

    // Run schema seed
    const schemaStatements = schemaSQL.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of schemaStatements) {
      db.run(stmt + ';');
    }

    // Run user query
    const startMs = performance.now();
    const results = db.exec(userQuery);
    const executionTimeMs = Math.round((performance.now() - startMs) * 100) / 100;

    if (!results.length) {
      return { columns: [], rows: [], executionTimeMs, error: null };
    }

    return {
      columns: results[0].columns,
      rows: results[0].values,
      executionTimeMs,
      error: null,
    };
  } catch (err) {
    return {
      columns: [],
      rows: [],
      executionTimeMs: 0,
      error: String(err.message || err),
    };
  } finally {
    if (db) {
      try { db.close(); } catch (_) { /* ignore */ }
    }
  }
}

// ── Validation Engine ─────────────────────────

function normalizeCell(val, floatTolerance) {
  if (val === null || val === undefined) return '__NULL__';
  if (typeof val === 'number') {
    if (!Number.isInteger(val)) {
      return Math.round(val / floatTolerance) * floatTolerance;
    }
    return val;
  }
  return String(val).trim().toLowerCase();
}

function normalizeRow(row, floatTolerance) {
  return row.map(cell => normalizeCell(cell, floatTolerance));
}

function serializeRow(row, floatTolerance) {
  return row.map(cell => normalizeCell(cell, floatTolerance)).join('|||');
}

function rowsEqual(a, b, floatTolerance) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const aVal = normalizeCell(a[i], floatTolerance);
    const bVal = normalizeCell(b[i], floatTolerance);

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      if (Math.abs(aVal - bVal) > floatTolerance) return false;
    } else if (String(aVal) !== String(bVal)) {
      return false;
    }
  }
  return true;
}

/**
 * Classify actual rows against expected rows.
 */
export function classifyRows(actualRows, expectedRows, floatTolerance = 0.0001) {
  const expectedSet = new Set(expectedRows.map(r => serializeRow(r, floatTolerance)));
  const actualSet = new Set(actualRows.map(r => serializeRow(r, floatTolerance)));

  return {
    matched: actualRows.filter(r => expectedSet.has(serializeRow(r, floatTolerance))),
    extra: actualRows.filter(r => !expectedSet.has(serializeRow(r, floatTolerance))),
    missing: expectedRows.filter(r => !actualSet.has(serializeRow(r, floatTolerance))),
  };
}

/**
 * Robust result validation with 5-layer comparison.
 * @param {{ columns: string[], rows: any[][] }} actual
 * @param {{ columns: string[], rows: any[][] }} expected
 * @param {object} flags - Override flags per problem
 * @returns {{ passed: boolean, reason: string, detail?: string, missingRows?: any[][], extraRows?: any[][], matchedRows?: any[][] }}
 */
export function validateResult(actual, expected, flags = {}) {
  const {
    orderSensitive = false,
    columnSensitive = false,
    floatTolerance = 0.0001,
  } = flags;

  // Layer 1: Column count match
  if (actual.columns.length !== expected.columns.length) {
    return {
      passed: false,
      reason: 'column_count_mismatch',
      detail: `Expected ${expected.columns.length} columns, got ${actual.columns.length}. Expected: [${expected.columns.join(', ')}]`,
    };
  }

  // Layer 2: Column name match (when required)
  if (columnSensitive) {
    const actualCols = actual.columns.map(c => String(c).toLowerCase());
    const expectedCols = expected.columns.map(c => String(c).toLowerCase());
    for (let i = 0; i < expectedCols.length; i++) {
      if (actualCols[i] !== expectedCols[i]) {
        return {
          passed: false,
          reason: 'column_name_mismatch',
          detail: `Expected column "${expectedCols[i]}" at position ${i + 1}, got "${actualCols[i]}"`,
        };
      }
    }
  }

  // Layer 3: Row count match
  if (actual.rows.length !== expected.rows.length) {
    const classification = classifyRows(actual.rows, expected.rows, floatTolerance);
    return {
      passed: false,
      reason: 'row_count_mismatch',
      detail: `Expected ${expected.rows.length} rows, got ${actual.rows.length}`,
      missingRows: classification.missing,
      extraRows: classification.extra,
      matchedRows: classification.matched,
    };
  }

  // Layer 4 & 5: Row content comparison
  if (orderSensitive) {
    // Order-sensitive: compare row by row
    for (let i = 0; i < expected.rows.length; i++) {
      if (!rowsEqual(actual.rows[i], expected.rows[i], floatTolerance)) {
        const classification = classifyRows(actual.rows, expected.rows, floatTolerance);
        return {
          passed: false,
          reason: 'row_mismatch',
          detail: `Row ${i + 1} differs from expected`,
          row: i,
          expectedRow: expected.rows[i],
          actualRow: actual.rows[i],
          missingRows: classification.missing,
          extraRows: classification.extra,
          matchedRows: classification.matched,
        };
      }
    }
  } else {
    // Order-independent: sort and compare
    const actualSorted = [...actual.rows].sort((a, b) =>
      serializeRow(a, floatTolerance).localeCompare(serializeRow(b, floatTolerance))
    );
    const expectedSorted = [...expected.rows].sort((a, b) =>
      serializeRow(a, floatTolerance).localeCompare(serializeRow(b, floatTolerance))
    );

    for (let i = 0; i < expectedSorted.length; i++) {
      if (!rowsEqual(actualSorted[i], expectedSorted[i], floatTolerance)) {
        const classification = classifyRows(actual.rows, expected.rows, floatTolerance);
        return {
          passed: false,
          reason: 'content_mismatch',
          detail: 'Row content differs from expected (order-independent comparison)',
          missingRows: classification.missing,
          extraRows: classification.extra,
          matchedRows: classification.matched,
        };
      }
    }
  }

  return {
    passed: true,
    reason: 'all_matched',
    matchedRows: actual.rows,
  };
}

export default {
  initSqlEngine,
  executeQuery,
  validateResult,
  classifyRows,
};
