const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Returns Express middleware that checks the authenticated user holds the
 * required role within the project identified by `req.params.projectId`.
 *
 * Usage: router.put('/:projectId', verifyToken, requireRole('ADMIN'), handler)
 *
 * @param {string} role - Required role, e.g. 'ADMIN'
 */
function requireRole(role) {
  return async function (req, res, next) {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId || !projectId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    try {
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (membership.role !== role) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Attach membership to request for downstream use
      req.membership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireRole };
