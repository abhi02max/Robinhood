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

export function validateServerEnv(rawEnv = process.env) {
  const result = serverEnvSchema.safeParse(rawEnv);
  if (result.success) return result.data;

  const details = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid server environment: ${details}`);
}

export { serverEnvSchema };
