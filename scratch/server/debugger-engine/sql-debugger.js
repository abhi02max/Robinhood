import sqlExecution from '../execution/sql.js';
import { validateSqlQuery } from '../execution/sql-policy.js';

const WRITE_STATEMENT_PATTERN = /\b(insert|update|delete|drop|truncate|alter|create|grant|revoke)\b/i;

function buildHintFromError(message) {
    const errorText = String(message || '').toLowerCase();
    if (errorText.includes('syntax error')) {
        return 'Check commas, parentheses, and keyword order near the reported token.';
    }
    if (errorText.includes('does not exist')) {
        return 'Validate table/column names and check schema qualifiers.';
    }
    if (errorText.includes('ambiguous')) {
        return 'Use explicit table aliases and qualify duplicate column names.';
    }
    if (errorText.includes('timeout')) {
        return 'Reduce scanned rows with selective WHERE predicates and indexes.';
    }
    return 'Run EXPLAIN on the query and simplify one join/filter at a time.';
}

export async function debugQuery(sql) {
    const query = String(sql || '').trim();
    if (!query) {
        return {
            valid: false,
            explanation: 'SQL query cannot be empty.',
            hint: 'Provide a SELECT query to validate syntax and logic.',
            rows: [],
            fields: [],
            rowCount: 0,
        };
    }

    if (WRITE_STATEMENT_PATTERN.test(query)) {
        return {
            valid: false,
            explanation: 'Only read-only SQL statements are supported in debugger mode.',
            hint: 'Use SELECT queries for validation and keep mutations in controlled execution pipelines.',
            rows: [],
            fields: [],
            rowCount: 0,
        };
    }

    try {
        validateSqlQuery(query);
    } catch (error) {
        return {
            valid: false,
            explanation: String(error?.message || 'Query blocked by SQL sandbox policy.'),
            hint: 'Only single-statement read-only SELECT queries against sandbox tables are allowed.',
            rows: [],
            fields: [],
            rowCount: 0,
        };
    }

    try {
        const result = await sqlExecution.runQuery({ query });
        const rows = Array.isArray(result?.rows) ? result.rows : [];
        const fields = Array.isArray(result?.fields) ? result.fields : [];

        return {
            valid: true,
            explanation: `Query is valid. Returned ${rows.length} row(s) in ${Number(result?.executionTime || 0)}ms.`,
            rows,
            fields,
            rowCount: rows.length,
            executionTimeMs: Number(result?.executionTime || 0),
            limited: /\blimit\b/i.test(query) || rows.length <= 100,
        };
    } catch (error) {
        return {
            valid: false,
            explanation: error?.message || 'SQL validation failed.',
            hint: buildHintFromError(error?.message || ''),
            errorCode: error?.code || null,
            rows: [],
            fields: [],
            rowCount: 0,
        };
    }
}