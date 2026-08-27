// ============================================
// ROBINHOOD ADMIN — Auth Middleware
// ============================================

export function requireAdmin(pgPool) {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated first
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'Authentication required' });
      }

      // Check admin role
      const { rows } = await pgPool.query(
        'SELECT role FROM admin_users WHERE user_id = $1',
        [userId]
      );

      if (!rows.length) {
        return res.status(403).json({ ok: false, error: 'Admin access required' });
      }

      req.adminRole = rows[0].role;
      req.adminUserId = userId;
      next();
    } catch (error) {
      console.error('[Admin] Auth check failed:', error.message);
      return res.status(500).json({ ok: false, error: 'Admin auth check failed' });
    }
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.adminRole)) {
      return res.status(403).json({
        ok: false,
        error: `Requires role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
}

export async function logAdminAction(pgPool, userId, action, entityType, entityId, details = {}) {
  try {
    await pgPool.query(
      `INSERT INTO admin_audit_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('[Admin] Audit log failed:', err.message);
  }
}
