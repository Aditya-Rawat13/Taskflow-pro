/**
 * Creates a fresh Express app instance for use in tests.
 * Mirrors app.js but creates a new instance per call to avoid shared state
 * between test suites running in the same process.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const authRoutes = require('../routes/auth.routes');
const projectRoutes = require('../routes/project.routes');
const taskRoutes = require('../routes/task.routes');
const dashboardRoutes = require('../routes/dashboard.routes');
const { errorHandler } = require('../utils/errors');

function createTestApp() {
  const app = express();

  // Security headers (Req 8.4)
  app.use(helmet());

  // CORS
  app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));

  // Body parsing
  app.use(express.json());

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/projects/:projectId/tasks', taskRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Global error handler
  app.use(errorHandler);

  return app;
}

module.exports = { createTestApp };
