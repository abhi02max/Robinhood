import { createHash } from 'crypto';

const AUTH_SESSION_PREFIX = 'auth:session:';
const DEFAULT_ANON_USER_ID = '00000000-0000-0000-0000-000000000000';

export function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function toSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function decodePathSegment(value) {
  try {
    return decodeURIComponent(String(value || '')).trim();
  } catch (_) {
    return String(value || '').trim();
  }
}

export function normalizeName(value) {
  return decodePathSegment(value).replace(/\s+/g, ' ').trim();
}

export function getPgPool(req) {
  return req?.app?.locals?.pgPool || null;
}

export function getRedisClient(req) {
  return req?.app?.locals?.redisClient || null;
}

export function getBearerToken(req) {
  const header = String(req?.headers?.authorization || '').trim();
  if (!header) return null;
  const [kind, token] = header.split(' ');
  if (kind !== 'Bearer' || !token) return null;
  return token.trim();
}

function parseSessionUserId(rawSession) {
  if (!rawSession || typeof rawSession !== 'object') return null;
  const candidate = rawSession.userId || rawSession.id || null;
  if (isUuid(candidate)) return candidate;
  return null;
}

function buildDeterministicUuid(seed) {
  const hash = createHash('sha1').update(String(seed || 'anon')).digest('hex');
  const chunk = hash.slice(0, 32).split('');
  chunk[12] = '4';
  chunk[16] = ['8', '9', 'a', 'b'][parseInt(chunk[16], 16) % 4];
  return `${chunk.slice(0, 8).join('')}-${chunk.slice(8, 12).join('')}-${chunk.slice(12, 16).join('')}-${chunk.slice(16, 20).join('')}-${chunk.slice(20, 32).join('')}`;
}

function gatherUserCandidates(req) {
  return [
    req?.user?.userId,
    req?.user?.id,
    req?.params?.userId,
    req?.params?.uid,
    req?.query?.userId,
    req?.query?.uid,
    req?.body?.userId,
    req?.body?.uid,
  ].filter(Boolean);
}

export function chooseExplicitUserId(req) {
  for (const candidate of gatherUserCandidates(req)) {
    if (isUuid(candidate)) return candidate;
  }
  return null;
}

async function resolveUserFromRedis(req, token) {
  const redisClient = getRedisClient(req);
  if (!redisClient?.isReady) return null;

  try {
    const sessionRaw = await redisClient.get(`${AUTH_SESSION_PREFIX}${token}`);
    if (!sessionRaw) return null;
    const session = JSON.parse(sessionRaw);
    return parseSessionUserId(session);
  } catch (_) {
    return null;
  }
}

async function resolveUserFromPostgres(req, token) {
  const pgPool = getPgPool(req);
  if (!pgPool) return null;

  try {
    const result = await pgPool.query(
      `SELECT user_id FROM sessions WHERE session_token = $1 AND expires > NOW() ORDER BY expires DESC LIMIT 1`,
      [token]
    );
    const userId = result?.rows?.[0]?.user_id || null;
    return isUuid(userId) ? userId : null;
  } catch (_) {
    return null;
  }
}

export async function resolveUserIdFromRequest(req, options = {}) {
  const explicit = chooseExplicitUserId(req);
  if (explicit) return explicit;

  const token = getBearerToken(req);
  if (token) {
    const redisUserId = await resolveUserFromRedis(req, token);
    if (redisUserId) return redisUserId;

    const pgUserId = await resolveUserFromPostgres(req, token);
    if (pgUserId) return pgUserId;
  }

  if (options.allowAnonymous === false) {
    return null;
  }

  const anonSeed = [
    req?.headers?.['x-forwarded-for'] || req?.ip || req?.socket?.remoteAddress || 'unknown-ip',
    req?.headers?.['user-agent'] || 'unknown-agent',
  ].join('|');

  return buildDeterministicUuid(anonSeed) || DEFAULT_ANON_USER_ID;
}

export function safeJsonParse(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

export function normalizeDate(value, fallbackIso = null) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return fallbackIso;
  }
  return date.toISOString().split('T')[0];
}

export function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
