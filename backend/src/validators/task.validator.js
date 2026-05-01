const Joi = require('joi');

/**
 * Schema for POST /api/projects/:projectId/tasks
 * Requirements: 4.3, 4.9
 * - title: 3–200 characters
 * - description: optional
 * - priority: LOW | MEDIUM | HIGH (defaults to MEDIUM)
 * - dueDate: valid ISO date string that is in the future
 * - assigneeId: optional UUID
 */
const createTaskSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().optional().allow(''),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').default('MEDIUM'),
  dueDate: Joi.date()
    .iso()
    .greater('now')
    .optional()
    .messages({
      'date.greater': '"dueDate" must be a future date',
      'date.format': '"dueDate" must be a valid ISO date string',
    }),
  assigneeId: Joi.string().uuid().optional().allow(null),
});

/**
 * Schema for PUT /api/projects/:projectId/tasks/:taskId
 * Requirements: 4.3, 4.9
 * All fields optional; at least one must be provided.
 */
const updateTaskSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  description: Joi.string().allow(''),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH'),
  dueDate: Joi.date()
    .iso()
    .greater('now')
    .allow(null)
    .messages({
      'date.greater': '"dueDate" must be a future date',
      'date.format': '"dueDate" must be a valid ISO date string',
    }),
  assigneeId: Joi.string().uuid().allow(null),
}).min(1);

/**
 * Schema for PATCH /api/projects/:projectId/tasks/:taskId/status
 * Requirements: 4.3
 * - status: one of the four TaskStatus values
 */
const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE')
    .required(),
});

module.exports = { createTaskSchema, updateTaskSchema, updateStatusSchema };
