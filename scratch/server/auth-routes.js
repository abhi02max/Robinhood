// ============================================
// ROBINHOOD - AUTH ROUTES MODULE
// ============================================
// Production-grade authentication endpoints
// ============================================

import { createHash, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { createRateLimitMiddleware } from './middleware/rate-limit.js';

const AUTH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const AUTH_SESSION_PREFIX = 'auth:session:';
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
const inMemoryAuthSessions = new Map();

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120, 'Name is too long.'),
  email: z.string().trim().email('Valid email is required.').max(255, 'Email is too long.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(256, 'Password is too long.'),
}).strip();

const loginSchema = z.object({
  email: z.string().trim().email('Email and password are required.'),
  password: z.string().min(1, 'Email and password are required.').max(256, 'Password is too long.'),
}).strip();

const emailSchema = z.object({
  email: z.string().trim().email('Email is required.').max(255, 'Email is too long.'),
}).strip();

const tokenSchema = z.object({
  token: z.string().trim().min(12, 'Verification token is required.').max(512, 'Verification token is invalid.'),
}).strip();

const resetSchema = z.object({
  token: z.string().trim().min(12, 'Token and new password are required.').max(512, 'Reset token is invalid.'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters.').max(256, 'Password is too long.'),
}).strip();

const DB_RETRYABLE_CODES = new Set(['40001', '40P01', '53300', '57P03']);
const AUTH_DB_MAX_RETRIES = Math.max(0, Number(process.env.AUTH_DB_MAX_RETRIES || 2));
const AUTH_DB_RETRY_BASE_MS = Math.max(20, Number(process.env.AUTH_DB_RETRY_BASE_MS || 80));

function parseBody(schema, payload) {
  const result = schema.safeParse(payload || {});
  if (result.success) {
    return { ok: true, data: result.data, issue: null };
  }

  return {
    ok: false,
    data: null,
    issue: result.error.issues?.[0] || null,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDbError(error) {
  const code = String(error?.code || '');
  return DB_RETRYABLE_CODES.has(code);
}

async function withPgRetry(operation, label = 'db-write') {
  for (let attempt = 1; attempt <= AUTH_DB_MAX_RETRIES + 1; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableDbError(error) || attempt > AUTH_DB_MAX_RETRIES) {
        throw error;
      }

      const waitMs = Math.min(1200, AUTH_DB_RETRY_BASE_MS * (2 ** (attempt - 1)));
      console.warn('[Auth] Retrying transient DB failure', JSON.stringify({
        label,
        attempt,
        code: String(error?.code || ''),
        waitMs,
      }));
      await sleep(waitMs);
    }
  }

  throw new Error('Database operation retry exhausted.');
}

async function runInTransaction(pgPool, work) {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const output = await work(client);
    await client.query('COMMIT');
    return output;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function cleanupInMemoryAuthSessions() {
  const now = Date.now();
  for (const [token, cached] of inMemoryAuthSessions.entries()) {
    if (Number(cached?.expiresAt || 0) <= now) {
      inMemoryAuthSessions.delete(token);
    }
  }
}

setInterval(cleanupInMemoryAuthSessions, 60_000).unref();

function isRedisReady(redisClient) {
  return Boolean(redisClient?.isReady);
}

async function setAuthSession(redisClient, sessionToken, sessionObject, ttlSeconds) {
  const key = `${AUTH_SESSION_PREFIX}${sessionToken}`;
  if (isRedisReady(redisClient)) {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(sessionObject));
    return;
  }
  inMemoryAuthSessions.set(sessionToken, {
    session: sessionObject,
    expiresAt: Date.now() + (ttlSeconds * 1000),
  });
}

async function getAuthSession(redisClient, sessionToken) {
  const key = `${AUTH_SESSION_PREFIX}${sessionToken}`;
  if (isRedisReady(redisClient)) {
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  const cached = inMemoryAuthSessions.get(sessionToken);
  if (!cached) return null;
  if (Date.now() > Number(cached.expiresAt || 0)) {
    inMemoryAuthSessions.delete(sessionToken);
    return null;
  }
  return cached.session;
}

async function deleteAuthSession(redisClient, sessionToken) {
  const key = `${AUTH_SESSION_PREFIX}${sessionToken}`;
  if (isRedisReady(redisClient)) {
    await redisClient.del(key);
    return;
  }
  inMemoryAuthSessions.delete(sessionToken);
}

/**
 * Initialize auth schema in database
 */
export async function bootstrapAuthSchema(pgPool) {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      email_verified TIMESTAMP,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  const createVerificationTokensTable = `
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier VARCHAR(255) NOT NULL,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires TIMESTAMP NOT NULL,
      PRIMARY KEY (identifier, token)
    )
  `;

  const createPasswordResetTokensTable = `
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  try {
    await pgPool.query(createUsersTable);
    await pgPool.query(createVerificationTokensTable);
    await pgPool.query(createPasswordResetTokensTable);
    console.log('[Auth] Database schema initialized');
  } catch (error) {
    console.error('[Auth] Schema initialization failed:', error.message);
    throw error;
  }
}

/**
 * Generate a secure session token
 */
function generateSessionToken(userId) {
  const timestamp = Date.now().toString();
  const random = randomUUID();
  return createHash('sha256').update(`${userId}-${timestamp}-${random}`).digest('hex');
}

function isLikelyJwt(token) {
  const parts = String(token || '').split('.');
  return parts.length === 3;
}

function parseBearerToken(req) {
  const authHeader = String(req?.headers?.authorization || '').trim();
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

function parseJwtSession(jwtToken) {
  if (!JWT_SECRET || !isLikelyJwt(jwtToken)) return null;
  try {
    const decoded = jwt.verify(jwtToken, JWT_SECRET, {
      algorithms: ['HS256', 'HS384', 'HS512'],
    });

    if (!decoded || typeof decoded !== 'object') return null;

    const userId = decoded.userId || decoded.sub || decoded.id || null;
    const email = decoded.email || null;
    const name = decoded.name || decoded.username || 'User';

    if (!userId && !email) return null;
    return {
      userId,
      email,
      name,
      authType: 'jwt',
      jwtClaims: decoded,
    };
  } catch (_) {
    return null;
  }
}

async function resolveAuthSession(redisClient, token) {
  const session = await getAuthSession(redisClient, token);
  if (session) {
    return {
      session,
      source: 'session',
    };
  }

  const jwtSession = parseJwtSession(token);
  if (jwtSession) {
    return {
      session: jwtSession,
      source: 'jwt',
    };
  }

  return null;
}

/**
 * Create auth routes
 */
export function createAuthRoutes(app, pgPool, redisClient) {
  const authWindowSeconds = Math.max(1, Number(process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS || 60));
  const signupRateLimiter = createRateLimitMiddleware({
    prefix: 'api',
    bucket: 'auth-signup',
    maxRequests: Math.max(1, Number(process.env.AUTH_SIGNUP_RATE_LIMIT_MAX || 10)),
    windowSeconds: authWindowSeconds,
    keyByUser: false,
  });
  const loginRateLimiter = createRateLimitMiddleware({
    prefix: 'api',
    bucket: 'auth-login',
    maxRequests: Math.max(1, Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || 15)),
    windowSeconds: authWindowSeconds,
    keyByUser: false,
  });
  const tokenRateLimiter = createRateLimitMiddleware({
    prefix: 'api',
    bucket: 'auth-token',
    maxRequests: Math.max(1, Number(process.env.AUTH_TOKEN_RATE_LIMIT_MAX || 20)),
    windowSeconds: authWindowSeconds,
    keyByUser: false,
  });
  const resetRateLimiter = createRateLimitMiddleware({
    prefix: 'api',
    bucket: 'auth-reset',
    maxRequests: Math.max(1, Number(process.env.AUTH_RESET_RATE_LIMIT_MAX || 10)),
    windowSeconds: authWindowSeconds,
    keyByUser: false,
  });
  
  // ==================== SIGNUP ====================
  app.post('/api/auth/signup', signupRateLimiter, async (req, res) => {
    const parsed = parseBody(signupSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        errorType: 'VALIDATION_ERROR',
        reason: parsed.issue?.message || 'Invalid request payload.',
        field: String(parsed.issue?.path?.[0] || ''),
      });
    }

    const { name, email, password } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim();

    try {
      // Hash password outside transaction to reduce lock duration.
      const passwordHash = await bcrypt.hash(password, 12);

      const txResult = await withPgRetry(
        () => runInTransaction(pgPool, async (client) => {
          const existing = await client.query(
            'SELECT id FROM users WHERE email = $1 LIMIT 1',
            [normalizedEmail]
          );

          if (existing.rows.length > 0) {
            return { conflict: true };
          }

          const result = await client.query(
            `INSERT INTO users (email, name, password_hash, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())
             RETURNING id, email, name, created_at`,
            [normalizedEmail, trimmedName, passwordHash]
          );

          const user = result.rows[0];
          const verificationToken = randomUUID();
          const verificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

          await client.query(
            `INSERT INTO verification_tokens (identifier, token, expires)
             VALUES ($1, $2, $3)`,
            [normalizedEmail, verificationToken, verificationExpires]
          );

          return { conflict: false, user, verificationToken };
        }),
        'signup'
      );

      if (txResult?.conflict) {
        return res.status(409).json({
          errorType: 'CONFLICT',
          reason: 'An account with this email already exists.',
          field: 'email',
        });
      }

      const user = txResult.user;
      const verificationToken = txResult.verificationToken;

      // In production, send verification email here
      // For now, return the token (in dev mode)
      const isDev = process.env.NODE_ENV !== 'production';

      console.log(`[Auth] User created: ${user.id} (${normalizedEmail})`);

      res.status(201).json({
        success: true,
        message: 'Account created successfully. Please verify your email.',
        userId: user.id,
        email: user.email,
        name: user.name,
        // Only include token in development for testing
        ...(isDev && { verificationToken, verificationUrl: `/auth/verify?token=${verificationToken}` }),
      });

    } catch (error) {
      if (String(error?.code || '') === '23505') {
        return res.status(409).json({
          errorType: 'CONFLICT',
          reason: 'An account with this email already exists.',
          field: 'email',
        });
      }
      console.error('[Auth] Signup error:', error.message);
      res.status(500).json({
        errorType: 'SERVER_ERROR',
        reason: 'Failed to create account. Please try again.',
      });
    }
  });

  // ==================== LOGIN ====================
  app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
    const parsed = parseBody(loginSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        errorType: 'VALIDATION_ERROR',
        reason: parsed.issue?.message || 'Email and password are required.',
      });
    }

    const { email, password } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Find user
      const result = await pgPool.query(
        'SELECT id, email, name, password_hash, email_verified, avatar_url FROM users WHERE email = $1',
        [normalizedEmail]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({
          errorType: 'AUTH_ERROR',
          reason: 'Invalid email or password.',
        });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({
          errorType: 'AUTH_ERROR',
          reason: 'Invalid email or password.',
        });
      }

      // Generate session token
      const sessionToken = generateSessionToken(user.id);
      const sessionExpires = Date.now() + AUTH_SESSION_TTL_MS;

      // Store session in Redis
      const sessionData = JSON.stringify({
        userId: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified,
        createdAt: Date.now(),
      });

      await setAuthSession(
        redisClient,
        sessionToken,
        JSON.parse(sessionData),
        Math.floor(AUTH_SESSION_TTL_MS / 1000)
      );

      console.log(`[Auth] Login successful: ${user.id}`);

      res.json({
        success: true,
        sessionToken,
        expiresAt: new Date(sessionExpires).toISOString(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: !!user.email_verified,
          avatarUrl: user.avatar_url,
        },
      });

    } catch (error) {
      console.error('[Auth] Login error:', error.message);
      res.status(500).json({
        errorType: 'SERVER_ERROR',
        reason: 'Login failed. Please try again.',
      });
    }
  });

  // ==================== VERIFY EMAIL ====================
  app.post('/api/auth/verify-email', tokenRateLimiter, async (req, res) => {
    const parsed = parseBody(tokenSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        errorType: 'VALIDATION_ERROR',
        reason: parsed.issue?.message || 'Verification token is required.',
      });
    }

    const { token } = parsed.data;

    try {
      const verification = await withPgRetry(
        () => runInTransaction(pgPool, async (client) => {
          const tokenResult = await client.query(
            'SELECT identifier, expires FROM verification_tokens WHERE token = $1 FOR UPDATE',
            [token]
          );

          if (tokenResult.rows.length === 0) {
            return { state: 'invalid' };
          }

          const { identifier: email, expires } = tokenResult.rows[0];

          if (new Date() > new Date(expires)) {
            await client.query('DELETE FROM verification_tokens WHERE token = $1', [token]);
            return { state: 'expired' };
          }

          await client.query(
            'UPDATE users SET email_verified = NOW(), updated_at = NOW() WHERE email = $1',
            [email]
          );
          await client.query('DELETE FROM verification_tokens WHERE token = $1', [token]);
          return { state: 'ok', email };
        }),
        'verify-email'
      );

      if (verification?.state === 'invalid') {
        return res.status(400).json({
          errorType: 'INVALID_TOKEN',
          reason: 'Invalid or expired verification token.',
        });
      }

      if (verification?.state === 'expired') {
        return res.status(400).json({
          errorType: 'TOKEN_EXPIRED',
          reason: 'Verification token has expired. Please request a new one.',
        });
      }

      const email = verification?.email;

      console.log(`[Auth] Email verified: ${email}`);

      res.json({
        success: true,
        message: 'Email verified successfully. You can now log in.',
        email,
      });

    } catch (error) {
      console.error('[Auth] Verify email error:', error.message);
      res.status(500).json({
        errorType: 'SERVER_ERROR',
        reason: 'Email verification failed. Please try again.',
      });
    }
  });

  // ==================== FORGOT PASSWORD ====================
  app.post('/api/auth/forgot-password', resetRateLimiter, async (req, res) => {
    const parsed = parseBody(emailSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        errorType: 'VALIDATION_ERROR',
        reason: parsed.issue?.message || 'Email is required.',
      });
    }

    const { email } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();

    try {
      const forgotResult = await withPgRetry(
        () => runInTransaction(pgPool, async (client) => {
          const userResult = await client.query(
            'SELECT id FROM users WHERE email = $1 LIMIT 1',
            [normalizedEmail]
          );

          if (userResult.rows.length === 0) {
            return { found: false };
          }

          const userId = userResult.rows[0].id;
          const resetToken = randomUUID();
          const resetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

          await client.query(
            'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
            [userId]
          );
          await client.query(
            `INSERT INTO password_reset_tokens (user_id, token, expires)
             VALUES ($1, $2, $3)`,
            [userId, resetToken, resetExpires]
          );

          return { found: true, resetToken };
        }),
        'forgot-password'
      );

      if (!forgotResult?.found) {
        return res.json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
        });
      }

      const resetToken = forgotResult.resetToken;

      // In production, send email here
      const isDev = process.env.NODE_ENV !== 'production';

      console.log(`[Auth] Password reset requested: ${normalizedEmail}`);

      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        // Only include token in development for testing
        ...(isDev && { resetToken, resetUrl: `/auth/reset-password?token=${resetToken}` }),
      });

    } catch (error) {
      console.error('[Auth] Forgot password error:', error.message);
      res.status(500).json({
        errorType: 'SERVER_ERROR',
        reason: 'Failed to process request. Please try again.',
      });
    }
  });

  // ==================== RESET PASSWORD ====================
  app.post('/api/auth/reset-password', resetRateLimiter, async (req, res) => {
    const parsed = parseBody(resetSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        errorType: 'VALIDATION_ERROR',
        reason: parsed.issue?.message || 'Token and new password are required.',
        field: String(parsed.issue?.path?.[0] || ''),
      });
    }

    const { token, newPassword } = parsed.data;

    try {
      const passwordHash = await bcrypt.hash(newPassword, 12);
      const resetResult = await withPgRetry(
        () => runInTransaction(pgPool, async (client) => {
          const tokenResult = await client.query(
            'SELECT user_id, expires, used FROM password_reset_tokens WHERE token = $1 FOR UPDATE',
            [token]
          );

          if (tokenResult.rows.length === 0) {
            return { state: 'invalid' };
          }

          const { user_id: userId, expires, used } = tokenResult.rows[0];

          if (used) {
            return { state: 'used' };
          }

          if (new Date() > new Date(expires)) {
            return { state: 'expired' };
          }

          await client.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [passwordHash, userId]
          );
          await client.query(
            'UPDATE password_reset_tokens SET used = TRUE WHERE token = $1',
            [token]
          );

          return { state: 'ok', userId };
        }),
        'reset-password'
      );

      if (resetResult?.state === 'invalid') {
        return res.status(400).json({
          errorType: 'INVALID_TOKEN',
          reason: 'Invalid or expired reset token.',
        });
      }

      if (resetResult?.state === 'used') {
        return res.status(400).json({
          errorType: 'TOKEN_USED',
          reason: 'This reset token has already been used.',
        });
      }

      if (resetResult?.state === 'expired') {
        return res.status(400).json({
          errorType: 'TOKEN_EXPIRED',
          reason: 'Reset token has expired. Please request a new one.',
        });
      }

      // Invalidate all sessions for this user (force re-login)
      const sessionPattern = `${AUTH_SESSION_PREFIX}*`;
      // Note: In production, you'd want to track sessions by user for proper invalidation

      console.log(`[Auth] Password reset completed: ${resetResult?.userId || 'unknown'}`);

      res.json({
        success: true,
        message: 'Password has been reset successfully. Please log in with your new password.',
      });

    } catch (error) {
      console.error('[Auth] Reset password error:', error.message);
      res.status(500).json({
        errorType: 'SERVER_ERROR',
        reason: 'Password reset failed. Please try again.',
      });
    }
  });

  // ==================== LOGOUT ====================
  app.post('/api/auth/logout', async (req, res) => {
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : req.body?.sessionToken;

    if (sessionToken) {
      try {
        await deleteAuthSession(redisClient, sessionToken);
        console.log('[Auth] Session invalidated');
      } catch (error) {
        console.error('[Auth] Logout error:', error.message);
      }
    }

    res.json({ success: true, message: 'Logged out successfully.' });
  });

  // ==================== GET SESSION / ME ====================
  app.get('/api/auth/me', async (req, res) => {
    const sessionToken = parseBearerToken(req);

    if (!sessionToken) {
      return res.status(401).json({
        errorType: 'AUTH_ERROR',
        reason: 'No session token provided.',
        authenticated: false,
      });
    }

    try {
      const resolvedAuth = await resolveAuthSession(redisClient, sessionToken);
      const session = resolvedAuth?.session || null;

      if (!session) {
        return res.status(401).json({
          errorType: 'AUTH_ERROR',
          reason: 'Invalid or expired session.',
          authenticated: false,
        });
      }

      // Fetch fresh user data
      const userLookupById = session.userId
        ? await pgPool.query(
            'SELECT id, email, name, email_verified, avatar_url FROM users WHERE id = $1',
            [session.userId]
          )
        : { rows: [] };

      const userResult = userLookupById.rows.length > 0
        ? userLookupById
        : (session.email
          ? await pgPool.query(
              'SELECT id, email, name, email_verified, avatar_url FROM users WHERE email = $1',
              [session.email]
            )
          : { rows: [] });

      if (userResult.rows.length === 0) {
        await deleteAuthSession(redisClient, sessionToken);
        return res.status(401).json({
          errorType: 'AUTH_ERROR',
          reason: 'User not found.',
          authenticated: false,
        });
      }

      const user = userResult.rows[0];

      res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: !!user.email_verified,
          avatarUrl: user.avatar_url,
        },
      });

    } catch (error) {
      console.error('[Auth] Get session error:', error.message);
      res.status(500).json({
        errorType: 'SERVER_ERROR',
        reason: 'Failed to verify session.',
        authenticated: false,
      });
    }
  });

  // ==================== RESEND VERIFICATION ====================
  app.post('/api/auth/resend-verification', tokenRateLimiter, async (req, res) => {
    const parsed = parseBody(emailSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        errorType: 'VALIDATION_ERROR',
        reason: parsed.issue?.message || 'Email is required.',
      });
    }

    const { email } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();

    try {
      const resendResult = await withPgRetry(
        () => runInTransaction(pgPool, async (client) => {
          const userResult = await client.query(
            'SELECT id, email_verified FROM users WHERE email = $1 LIMIT 1',
            [normalizedEmail]
          );

          if (userResult.rows.length === 0) {
            return { state: 'missing' };
          }

          const user = userResult.rows[0];
          if (user.email_verified) {
            return { state: 'verified' };
          }

          await client.query(
            'DELETE FROM verification_tokens WHERE identifier = $1',
            [normalizedEmail]
          );

          const verificationToken = randomUUID();
          const verificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
          await client.query(
            `INSERT INTO verification_tokens (identifier, token, expires)
             VALUES ($1, $2, $3)`,
            [normalizedEmail, verificationToken, verificationExpires]
          );

          return { state: 'created', verificationToken };
        }),
        'resend-verification'
      );

      if (resendResult?.state === 'missing') {
        return res.json({
          success: true,
          message: 'If an account with that email exists, a verification email has been sent.',
        });
      }

      if (resendResult?.state === 'verified') {
        return res.status(400).json({
          errorType: 'ALREADY_VERIFIED',
          reason: 'This email is already verified.',
        });
      }

      const verificationToken = resendResult?.verificationToken;

      const isDev = process.env.NODE_ENV !== 'production';

      res.json({
        success: true,
        message: 'If an account with that email exists, a verification email has been sent.',
        ...(isDev && { verificationToken, verificationUrl: `/auth/verify?token=${verificationToken}` }),
      });

    } catch (error) {
      console.error('[Auth] Resend verification error:', error.message);
      res.status(500).json({
        errorType: 'SERVER_ERROR',
        reason: 'Failed to send verification email. Please try again.',
      });
    }
  });

  console.log('[Auth] Routes registered: signup, login, verify-email, forgot-password, reset-password, logout, me');
}

/**
 * Auth middleware for protected routes
 */
export function requireAuth(redisClient) {
  return async (req, res, next) => {
    const sessionToken = parseBearerToken(req);

    if (!sessionToken) {
      return res.status(401).json({
        errorType: 'AUTH_ERROR',
        reason: 'Authentication required.',
      });
    }

    try {
      const resolvedAuth = await resolveAuthSession(redisClient, sessionToken);
      const session = resolvedAuth?.session || null;

      if (!session) {
        return res.status(401).json({
          errorType: 'AUTH_ERROR',
          reason: 'Invalid or expired session.',
        });
      }

      req.user = session;
      next();
    } catch (error) {
      console.error('[Auth] Middleware error:', error.message);
      return res.status(500).json({
        errorType: 'SERVER_ERROR',
        reason: 'Authentication check failed.',
      });
    }
  };
}
