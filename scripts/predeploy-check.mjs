import { spawn } from 'node:child_process';
import process from 'node:process';

const isWindows = process.platform === 'win32';
const npmCmd = 'npm';
const dockerCmd = isWindows ? 'docker.exe' : 'docker';
const DEFAULT_API_BASE_URL = process.env.PREDEPLOY_API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;

function quoteForCmd(arg) {
  const text = String(arg);
  if (!/[\s"&|<>^]/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function runCommand(command, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n[predeploy] ${label}`);
    console.log(`[predeploy] > ${command} ${args.join(' ')}`);

    const commandToRun = isWindows && command === npmCmd ? 'cmd.exe' : command;
    const argsToRun = isWindows && command === npmCmd
      ? ['/d', '/s', '/c', `${npmCmd} ${args.map(quoteForCmd).join(' ')}`]
      : args;

    const child = spawn(commandToRun, argsToRun, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
      shell: false,
    });

    child.on('error', (error) => {
      reject(new Error(`${label} failed to start: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

async function fetchJsonWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

async function runHealthChecks(baseUrl) {
  console.log(`\n[predeploy] Health checks against ${baseUrl}`);

  const checks = [
    {
      path: '/api/health',
      validator: (body) => body?.status === 'ok',
      note: 'liveness summary',
    },
    {
      path: '/api/health/live',
      validator: (body) => body?.status === 'ok',
      note: 'process liveness',
    },
    {
      path: '/api/health/ready',
      validator: (body) => body?.status === 'ok' || body?.status === 'degraded',
      note: 'dependency readiness',
    },
    {
      path: '/api/ai/health',
      validator: (body) => body?.status === 'ok',
      note: 'AI gateway health',
    },
  ];

  for (const check of checks) {
    const url = `${baseUrl}${check.path}`;
    const result = await fetchJsonWithTimeout(url);
    if (!result.ok || !check.validator(result.body)) {
      throw new Error(`Health check failed (${check.note}) at ${check.path}: HTTP ${result.status}`);
    }
    console.log(`[predeploy] PASS ${check.path}`);
  }
}

async function main() {
  console.log('[predeploy] Starting fail-fast deployment gate...');

  await runCommand(npmCmd, ['--workspace', 'scratch', 'run', 'gate:regression'], 'Regression shield suite');
  await runCommand(process.execPath, ['scratch/audit-endpoints.mjs'], 'Endpoint audit');

  await runHealthChecks(DEFAULT_API_BASE_URL);

  await runCommand(npmCmd, ['--workspace', 'scratch', 'run', 'build'], 'Production build');

  await runCommand(dockerCmd, ['compose', 'version'], 'Docker Compose availability');
  await runCommand(dockerCmd, ['compose', 'config', '-q'], 'Docker Compose validation (default)');
  await runCommand(dockerCmd, ['compose', '-f', 'docker-compose.minimal.yml', 'config', '-q'], 'Docker Compose validation (minimal)');
  await runCommand(dockerCmd, ['compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.cpu.yml', 'config', '-q'], 'Docker Compose validation (cpu override)');

  console.log('\n[predeploy] All deployment gates passed.');
}

main().catch((error) => {
  console.error(`\n[predeploy] FAILED: ${error.message}`);
  process.exitCode = 1;
});
