import { execSync } from 'node:child_process';

function getNetstatLines() {
  try {
    return execSync('netstat -ano -p tcp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function findPidsOnPort(port) {
  const lines = getNetstatLines();
  const matches = lines.filter((line) => {
    const normalized = line.trim().replace(/\s+/g, ' ');
    return normalized.includes(`:${port} `) && normalized.includes('LISTENING');
  });

  const pids = new Set();
  for (const line of matches) {
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts[parts.length - 1]);
    if (Number.isFinite(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
}

function getProcessInfo(pid) {
  try {
    const raw = execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"ProcessId=${pid}\\" | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const webPort = Number(process.env.BUILD_SAFE_PORT || 5173);
const pids = findPidsOnPort(webPort);

if (!pids.length) {
  process.exit(0);
}

const offenders = pids
  .map((pid) => ({ pid, info: getProcessInfo(pid) }))
  .filter((x) => {
    const cmd = String(x.info?.CommandLine || '').toLowerCase();
    return cmd.includes('next dev') || cmd.includes('next start') || cmd.includes('vite');
  });

if (!offenders.length) {
  process.exit(0);
}

console.error(`Build safety check failed: port ${webPort} is already in use by active web server process(es).`);
for (const offender of offenders) {
  console.error(`- PID ${offender.pid}: ${offender.info?.Name || 'unknown'} :: ${offender.info?.CommandLine || 'unknown command'}`);
}
console.error('Stop these processes before running `npm run build` to avoid .next/runtime corruption.');
process.exit(1);
