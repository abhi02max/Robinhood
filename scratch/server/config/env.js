import { z } from 'zod';

const positiveInteger = z.coerce.number().int().positive();
const nonNegativeInteger = z.coerce.number().int().nonnegative();

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1).optional(),
  POSTGRES_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),
  CORS_ALLOW_ORIGINS: z.string().default(''),
  TRUST_PROXY: nonNegativeInteger.default(0),
  API_RATE_LIMIT_WINDOW_MS: positiveInteger.default(60_000),
  API_RATE_LIMIT_MAX: positiveInteger.default(300),
  API_RATE_LIMIT_AUTH_MAX: positiveInteger.default(40),
  API_RATE_LIMIT_EXEC_MAX: positiveInteger.default(80),
  AI_TIMEOUT_MS: positiveInteger.default(18_000),
  AI_MIN_INTERVAL_MS: nonNegativeInteger.default(4_000),
  AI_CACHE_TTL_MS: positiveInteger.default(600_000),
  AI_RATE_LIMIT_MAX: positiveInteger.default(5),
  AI_RATE_LIMIT_WINDOW_SECONDS: positiveInteger.default(30),
  AI_DAILY_REQUEST_LIMIT: positiveInteger.default(100),
  AI_GLOBAL_CONCURRENCY_LIMIT: positiveInteger.default(8),
  PISTON_TIMEOUT_MS: positiveInteger.default(10_000),
  // Explicit opt-in to per-process session storage. See the REDIS_URL rule below.
  ALLOW_IN_MEMORY_SESSIONS: z.enum(['true', 'false']).default('false'),
}).superRefine((env, ctx) => {
  if (!env.DATABASE_URL && !env.POSTGRES_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DATABASE_URL'],
      message: 'DATABASE_URL or POSTGRES_URL is required.',
    });
  }
  if (env.NODE_ENV === 'production') {
    const origins = env.CORS_ALLOW_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean);
    if (!origins.length || origins.includes('*')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ALLOW_ORIGINS'],
        message: 'Production requires an explicit CORS allow-list and cannot use *.',
      });
    }

  }
});

/**
 * Production must not accept the REDIS_URL default.
 *
 * The default points at localhost, which in production is silently wrong: the
 * connection fails, sessions fall back to per-process memory, and then every user is
 * signed out by a restart while a token issued by one replica is unknown to the
 * others. Neither symptom appears in a health check.
 *
 * This lives outside the Zod schema because superRefine only sees values after
 * defaults are applied, so it cannot tell "explicitly set to the default" from
 * "never set at all". That distinction is the whole point of the check.
 */
function checkProductionRedis(rawEnv, parsed) {
  if (parsed.NODE_ENV !== 'production') return null;
  if (parsed.ALLOW_IN_MEMORY_SESSIONS === 'true') return null;
  const provided = typeof rawEnv.REDIS_URL === 'string' && rawEnv.REDIS_URL.trim().length > 0;
  if (provided) return null;
  return 'REDIS_URL: Production requires an explicit REDIS_URL, because sessions are stored there. '
    + 'Set ALLOW_IN_MEMORY_SESSIONS=true only for a single-process deployment that accepts signing '
    + 'every user out on restart.';
}

export function validateServerEnv(rawEnv = process.env) {
  const result = serverEnvSchema.safeParse(rawEnv);
  if (result.success) {
    const redisIssue = checkProductionRedis(rawEnv, result.data);
    if (redisIssue) throw new Error(`Invalid server environment: ${redisIssue}`);
    return result.data;
  }

  const details = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid server environment: ${details}`);
}

export { serverEnvSchema };
