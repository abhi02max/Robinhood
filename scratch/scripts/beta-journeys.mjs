const base = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:3000';

async function requestJson(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
}

async function run() {
  const startedAt = Date.now();
  const results = [];

  const email = `beta.${Date.now()}@example.com`;
  const password = 'BetaPass123!';

  let sessionToken = null;
  let userId = null;

  async function step(name, fn) {
    const t0 = Date.now();
    try {
      const info = await fn();
      results.push({ name, ok: true, latencyMs: Date.now() - t0, ...info });
    } catch (error) {
      results.push({
        name,
        ok: false,
        latencyMs: Date.now() - t0,
        error: String(error?.message || error),
      });
    }
  }

  await step('1_signup_new_user', async () => {
    const { status, data } = await requestJson('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Beta User', email, password }),
    });
    if (status !== 201) throw new Error(`signup status ${status}`);
    userId = data?.userId || null;
    return { status };
  });

  await step('2_login', async () => {
    const { status, data } = await requestJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (status !== 200) throw new Error(`login status ${status}`);
    sessionToken = data?.sessionToken || null;
    userId = userId || data?.user?.id || null;
    return { status };
  });

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
  });

  await step('3_start_learning_os', async () => {
    const { status } = await requestJson('/api/content/subject/OS', {
      headers: authHeaders(),
    });
    if (status !== 200) throw new Error(`subject status ${status}`);
    return { status };
  });

  await step('4_open_pdf', async () => {
    const { status, data } = await requestJson('/api/content/pdf/OS/CPU%20Scheduling', {
      headers: authHeaders(),
    });
    if (status !== 200) throw new Error(`pdf status ${status}`);
    return { status, hasPdfUrl: Boolean(data?.url) };
  });

  await step('5_watch_youtube_section', async () => {
    const { status, data } = await requestJson('/api/content/youtube/OS/CPU%20Scheduling?subtopic=Round%20Robin', {
      headers: authHeaders(),
    });
    if (status !== 200) throw new Error(`youtube status ${status}`);
    return { status, videoCount: Array.isArray(data?.videos) ? data.videos.length : 0 };
  });

  await step('6_solve_dsa_problem_lookup', async () => {
    const { status, data } = await requestJson('/api/problems?company=google&category=arrays', {
      headers: authHeaders(),
    });
    if (status !== 200) throw new Error(`problems status ${status}`);
    return { status, problemCount: Array.isArray(data?.items) ? data.items.length : 0 };
  });

  await step('7_run_code_execute', async () => {
    const { status, data } = await requestJson('/api/code/execute', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        language: 'javascript',
        codeSnippet: 'function solve(){return 42;}\nconsole.log(solve())',
        testInput: '',
        expectedOutput: '42',
        mode: 'run',
      }),
    });
    if (status !== 200) throw new Error(`code execute status ${status}`);
    return { status, verdict: data?.verdict || null };
  });

  await step('8_run_sql_query', async () => {
    const { status, data } = await requestJson('/api/execute/sql', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ query: 'SELECT 1 AS ok', userId }),
    });
    if (status !== 200 || data?.success !== true) {
      throw new Error(`sql status ${status} success=${data?.success}`);
    }
    return { status };
  });

  await step('9_ask_ai_mentor', async () => {
    const { status, data } = await requestJson('/api/ai/mentor', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        problemTitle: 'Two Sum',
        codeSnippet: 'function twoSum(a,t){return []}',
        actionType: 'hint',
        category: 'Arrays',
        userId,
      }),
    });
    if (status !== 200 && status !== 429) throw new Error(`ai mentor status ${status}`);
    return { status, provider: data?.provider || null, degraded: Boolean(data?.degraded) };
  });

  await step('10_schedule_revision', async () => {
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { status } = await requestJson('/api/scheduler/create', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        userId,
        title: 'Revise CPU Scheduling',
        taskType: 'revision',
        dueDate,
      }),
    });
    if (status !== 201) throw new Error(`scheduler status ${status}`);
    return { status };
  });

  await step('11_check_analytics', async () => {
    const { status, data } = await requestJson(`/api/analytics/progress?userId=${encodeURIComponent(userId)}`, {
      headers: authHeaders(),
    });
    if (status !== 200) throw new Error(`analytics status ${status}`);
    return { status, mastery: data?.mastery };
  });

  const passed = results.filter((item) => item.ok).length;
  const report = {
    generatedAt: new Date().toISOString(),
    apiBase: base,
    totalJourneys: results.length,
    passed,
    failed: results.length - passed,
    durationMs: Date.now() - startedAt,
    results,
  };

  console.log(JSON.stringify(report, null, 2));
  if (report.failed > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
