const { Router } = require('express');
const { register, login, me } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

const router = Router();

// POST /api/auth/register — validate body, then register
router.post('/register', validateBody(registerSchema), register);

// POST /api/auth/login — validate body, then login
router.post('/login', validateBody(loginSchema), login);

// GET /api/auth/me — require valid JWT, return current user
router.get('/me', authenticate, me);

module.exports = router;
