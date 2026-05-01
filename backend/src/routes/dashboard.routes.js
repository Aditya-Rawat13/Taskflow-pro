const { Router } = require('express');
const { getDashboard } = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

// GET /api/dashboard — requires authentication (Req 5.1)
router.get('/', authenticate, getDashboard);

module.exports = router;
