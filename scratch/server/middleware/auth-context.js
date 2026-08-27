import jwt from 'jsonwebtoken';

const AUTH_SESSION_PREFIX = 'auth:session:';
const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();

function parseBearerToken(req) {
  const header = String(req?.headers?.authorization || '').trim();
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

function isLikelyJwt(token) {
  const parts = String(token || '').split('.');
  return parts.length === 3;
}

function parseJwtSession(token) {
  if (!JWT_SECRET || !isLikelyJwt(token)) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256', 'HS384', 'HS512'],
    });

    if (!decoded || typeof decoded !== 'object') return null;

    const userId = decoded.userId || decoded.sub || decoded.id || null;
    const email = decoded.email || null;
    const name = decoded.name || decoded.username || null;

    if (!userId && !email) return null;

    return {
      userId,
      email,
      name,
      authType: 'jwt',
      jwtClaims: decoded,
    };
  } catch {
    return null;
  }
}

async function parseSessionFromRedis(redisClient, token) {
  if (!redisClient?.isReady) return null;

  try {
    const raw = await redisClient.get(`${AUTH_SESSION_PREFIX}${token}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      ...parsed,
      authType: 'session',
    };
  } catch {
    return null;
  }
}

export function createAuthContextMiddleware() {
  return async function authContextMiddleware(req, _res, next) {
    try {
      if (req.user) return next();

      const token = parseBearerToken(req);
      if (!token) return next();

      const redisClient = req?.app?.locals?.redisClient || null;
      const session = await parseSessionFromRedis(redisClient, token);
      if (session) {
        req.user = session;
        return next();
      }

      const jwtSession = parseJwtSession(token);
      if (jwtSession) {
        req.user = jwtSession;
      }

      return next();
    } catch {
      return next();
    }
  };
}

export default {
  createAuthContextMiddleware,
};
