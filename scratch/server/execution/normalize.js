// Result normalization for Piston, Judge0, SQL
function normalizeExecutionResult(raw, source) {
  if (source === 'piston') {
    const run = raw?.run || {};
    const error = raw?.error || run?.stderr || run?.compile_output || raw?.stderr || '';
    const output = run?.stdout || raw?.output || raw?.stdout || '';
    return {
      success: !error,
      output,
      error,
      executionTime: run?.time || raw?.time || '',
      memory: run?.memory || raw?.memory || '',
      verdict: error ? 'Error' : 'Success',
      testCasesPassed: 0,
      totalTestCases: 0,
    };
  }
  if (source === 'judge0') {
    const statusId = Number(raw?.status?.id || 0);
    const error = raw?.error || raw?.stderr || raw?.compile_output || '';
    const passed = Number(raw?.passed || 0);
    const total = Number(raw?.total || 0);
    const successByTestCases = total > 0 ? passed === total : statusId === 3;
    return {
      success: successByTestCases && !error,
      output: raw?.stdout || '',
      error,
      executionTime: raw?.time || '',
      memory: raw?.memory || '',
      verdict: raw?.status?.description || (error ? 'Error' : (successByTestCases ? 'Accepted' : 'Unknown')),
      testCasesPassed: passed,
      totalTestCases: total,
      caseResults: Array.isArray(raw?.caseResults) ? raw.caseResults : [],
      provider: raw?.fallbackProvider ? String(raw.fallbackProvider) : 'judge0',
      fallback: Boolean(raw?.fallbackProvider),
      fallbackReason: raw?.fallbackReason || '',
    };
  }
  if (source === 'sql') {
    return {
      success: !raw.error,
      output: raw.rows || [],
      fields: raw.fields || [],
      error: raw.error || '',
      executionTime: raw.executionTime || '',
      memory: '',
      verdict: raw.error ? 'Error' : 'Success',
      testCasesPassed: 0,
      totalTestCases: 0,
    };
  }
  // fallback
  return {
    success: false,
    output: '',
    error: 'Unknown result',
    executionTime: '',
    memory: '',
    verdict: 'Unknown',
    testCasesPassed: 0,
    totalTestCases: 0,
  };
}

export default normalizeExecutionResult;
