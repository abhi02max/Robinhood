const fallbackBuckets = new Map();

function nowMs() {
  return Date.now();
}

function getClientIp(req) {
  const forwardedFor = req?.headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || 'unknown';
}

function resolveIdentity(req, { keyByUser = true } = {}) {
  if (keyByUser) {
    const userId = req?.user?.userId || req?.user?.id || null;
    if (userId) {
      return `user:${String(userId).slice(0, 128)}`;
    }
  }
  return `ip:${getClientIp(req)}`;
}

function takeFallbackSlot(key, maxRequests, windowSeconds) {
  const now = nowMs();
  const existing = fallbackBuckets.get(key);

  if (!existing || Number(existing.resetAt || 0) <= now) {
    const fresh = {
      count: 1,
      resetAt: now + (windowSeconds * 1000),
    };
    fallbackBuckets.set(key, fresh);
    return {
      limited: false,
      remaining: Math.max(0, maxRequests - 1),
      retryAfterSeconds: windowSeconds,
      source: 'memory',
    };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((Number(existing.resetAt || now) - now) / 1000));
  return {
    limited: existing.count > maxRequests,
    remaining: Math.max(0, maxRequests - existing.count),
    retryAfterSeconds,
    source: 'memory',
  };
}

async function takeRedisSlot(redisClient, key, maxRequests, windowSeconds) {
  const current = await redisClient.incr(key);
  if (Number(current) === 1) {
    await redisClient.expire(key, windowSeconds);
  }

  let ttl = await redisClient.ttl(key);
  if (!Number.isFinite(ttl) || ttl <= 0) {
    ttl = windowSeconds;
  }

  return {
    limited: Number(current) > maxRequests,
    remaining: Math.max(0, maxRequests - Number(current)),
    retryAfterSeconds: Math.max(1, Number(ttl) || windowSeconds),
    source: 'redis',
  };
}

export function createRateLimitMiddleware(options = {}) {
  const {
    prefix = 'api',
    bucket = 'default',
    maxRequests = 60,
    windowSeconds = 60,
    keyByUser = true,
    skipPaths = [],
  } = options;

  const safePrefix = String(prefix || 'api').replace(/[^a-z0-9:_-]/gi, '').toLowerCase() || 'api';
  const safeBucket = String(bucket || 'default').replace(/[^a-z0-9:_-]/gi, '').toLowerCase() || 'default';
  const max = Math.max(1, Number(maxRequests || 60));
  const windowSec = Math.max(1, Number(windowSeconds || 60));
  const skipMatchers = Array.isArray(skipPaths)
    ? skipPaths.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  return async function rateLimitMiddleware(req, res, next) {
    try {
      const requestPath = String(req?.path || req?.originalUrl || '');
      if (skipMatchers.some((matcher) => requestPath.startsWith(matcher))) {
        return next();
      }

      const identity = resolveIdentity(req, { keyByUser });
      const key = `${safePrefix}:ratelimit:${safeBucket}:${identity}`;

      const redisClient = req?.app?.locals?.redisClient || null;
      let result;
      if (redisClient?.isReady) {
        try {
          result = await takeRedisSlot(redisClient, key, max, windowSec);
        } catch {
          result = takeFallbackSlot(key, max, windowSec);
        }
      } else {
        result = takeFallbackSlot(key, max, windowSec);
      }

      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(result.retryAfterSeconds));

      if (!result.limited) {
        return next();
      }

      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      return res.status(429).json({
        errorType: 'RATE_LIMIT',
        reason: 'Too many requests. Please retry later.',
        retryAfter: result.retryAfterSeconds,
        requestId: req?.requestId || null,
      });
    } catch (error) {
      return next(error);
    }
  };
}

setInterval(() => {
  const now = nowMs();
  for (const [key, bucket] of fallbackBuckets.entries()) {
    if (Number(bucket?.resetAt || 0) <= now) {
      fallbackBuckets.delete(key);
    }
  }
}, 30_000).unref();

export default { createRateLimitMiddleware };
