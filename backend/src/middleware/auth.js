const { verifyToken } = require('../utils/jwt');

/**
 * Express middleware that validates a Bearer JWT from the Authorization header.
 * On success, attaches `req.user = { id, email, name }` and calls next().
 * On failure, returns 401.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
