const REDACT_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
]);

function sanitizeObject(value, depth = 0) {
  if (depth > 4) return '[max-depth]';

  if (value == null) return value;
  if (typeof value === 'string') {
    if (value.length > 800) return `${value.slice(0, 800)}...[truncated]`;
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.slice(0, 80).map((item) => sanitizeObject(item, depth + 1));
  }

  if (typeof value === 'object') {
    const next = {};
    for (const [key, raw] of Object.entries(value)) {
      const normalizedKey = String(key || '').toLowerCase();
      if (REDACT_KEYS.has(normalizedKey)) {
        next[key] = '[redacted]';
        continue;
      }
      next[key] = sanitizeObject(raw, depth + 1);
    }
    return next;
  }

  return String(value);
}

function emit(level, scope, event, payload = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    event,
    ...sanitizeObject(payload),
  };

  const serialized = JSON.stringify(entry);
  if (level === 'error') {
    console.error(serialized);
    return;
  }
  if (level === 'warn') {
    console.warn(serialized);
    return;
  }
  console.log(serialized);
}

export function createLogger(scope = 'app') {
  const normalizedScope = String(scope || 'app').trim().toLowerCase();

  return {
    debug(event, payload = {}) {
      if (String(process.env.LOG_LEVEL || '').toLowerCase() === 'debug') {
        emit('debug', normalizedScope, event, payload);
      }
    },
    info(event, payload = {}) {
      emit('info', normalizedScope, event, payload);
    },
    warn(event, payload = {}) {
      emit('warn', normalizedScope, event, payload);
    },
    error(event, payload = {}) {
      emit('error', normalizedScope, event, payload);
    },
    child(childScope = '') {
      const suffix = String(childScope || '').trim().toLowerCase();
      return createLogger(suffix ? `${normalizedScope}.${suffix}` : normalizedScope);
    },
  };
}

export default {
  createLogger,
};
