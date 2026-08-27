const BASE = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:3000';
const TEST_USER = process.env.DOMAIN_TEST_USER || '11111111-1111-4111-8111-111111111111';

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { response, data };
}

function assertStatus(actual, expected, label) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(actual)) {
    throw new Error(`${label} expected ${allowed.join('/')} but got ${actual}`);
  }
}

async function run() {
  const checks = [
    {
      name: 'content:subject',
      run: () => request('/api/content/subject/DSA'),
      expect: [200],
    },
    {
      name: 'content:pdf',
      run: () => request('/api/content/pdf/DSA/Arrays%20and%20Strings'),
      expect: [200],
    },
    {
      name: 'content:notes',
      run: () => request('/api/content/notes/DSA/Arrays%20and%20Strings'),
      expect: [200],
    },
    {
      name: 'content:youtube',
      run: () => request('/api/content/youtube/DSA/Arrays%20and%20Strings'),
      expect: [200],
    },
    {
      name: 'interview:technical',
      run: () => request('/api/interview/technical/google'),
      expect: [200],
    },
    {
      name: 'interview:behavioral',
      run: () => request('/api/interview/behavioral/google'),
      expect: [200],
    },
    {
      name: 'interview:hr',
      run: () => request('/api/interview/hr/google'),
      expect: [200],
    },
    {
      name: 'interview:mock-session',
      run: () => request('/api/interview/mock-session', {
        method: 'POST',
        body: { type: 'technical', companyId: 'Google', userId: TEST_USER },
      }),
      expect: [200],
    },
    {
      name: 'debugger:run',
      run: () => request('/api/debugger/run', {
        method: 'POST',
        body: {
          language: 'python',
          code: 'a=1\nb=2\nprint(a+b)',
        },
      }),
      expect: [200],
    },
    {
      name: 'debugger:sql',
      run: () => request('/api/debugger/sql', {
        method: 'POST',
        body: { query: 'SELECT 1 AS ok;' },
      }),
      expect: [200],
    },
    {
      name: 'debugger:explain',
      run: () => request('/api/debugger/explain', {
        method: 'POST',
        body: {
          error: 'Traceback (most recent call last):\n  File "main.py", line 1, in <module>\n    print(1/0)\nZeroDivisionError: division by zero',
          code: 'print(1/0)',
        },
      }),
      expect: [200],
    },
    {
      name: 'analytics:progress',
      run: () => request('/api/analytics/progress?userId=' + encodeURIComponent(TEST_USER)),
      expect: [200],
    },
    {
      name: 'analytics:streaks',
      run: () => request('/api/analytics/streaks?userId=' + encodeURIComponent(TEST_USER)),
      expect: [200],
    },
    {
      name: 'analytics:readiness',
      run: () => request(`/api/analytics/readiness/${encodeURIComponent(TEST_USER)}/google`),
      expect: [200],
    },
    {
      name: 'scheduler:today',
      run: () => request('/api/scheduler/today?userId=' + encodeURIComponent(TEST_USER)),
      expect: [200],
    },
    {
      name: 'scheduler:create',
      run: () => request('/api/scheduler/create', {
        method: 'POST',
        body: {
          userId: TEST_USER,
          taskType: 'study',
          title: 'Revise OS deadlocks',
          dueDate: new Date().toISOString().split('T')[0],
        },
      }),
      expect: [201],
    },
    {
      name: 'scheduler:today:create',
      run: () => request('/api/scheduler/today/create', {
        method: 'POST',
        body: {
          userId: TEST_USER,
          taskType: 'revision',
          title: 'Revise DBMS indexing',
          dueDate: new Date().toISOString().split('T')[0],
        },
      }),
      expect: [201],
    },
    {
      name: 'scheduler:planner',
      run: () => request(`/api/scheduler/planner/${encodeURIComponent(TEST_USER)}/daily`),
      expect: [200],
    },
    {
      name: 'scheduler:reminders',
      run: () => request(`/api/scheduler/reminders/${encodeURIComponent(TEST_USER)}`, {
        method: 'POST',
        body: {},
      }),
      expect: [200],
    },
  ];

  let pass = 0;
  const failures = [];

  for (const check of checks) {
    try {
      const { response, data } = await check.run();
      assertStatus(response.status, check.expect, check.name);
      pass += 1;
      console.log(`PASS ${check.name} (${response.status})`);
    } catch (error) {
      failures.push({ name: check.name, error: error.message });
      console.log(`FAIL ${check.name} -> ${error.message}`);
    }
  }

  console.log(`\nSummary: ${pass}/${checks.length} checks passed.`);
  if (failures.length) {
    console.log('Failures:');
    for (const failure of failures) {
      console.log(`- ${failure.name}: ${failure.error}`);
    }
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Audit script crashed:', error?.message || String(error));
  process.exitCode = 1;
});
