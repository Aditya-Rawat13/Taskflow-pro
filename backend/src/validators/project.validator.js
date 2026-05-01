const Joi = require('joi');

/**
 * Schema for POST /api/projects
 * Requirements: 2.8
 * - name: 3–100 characters
 * - description: optional string
 */
const createProjectSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().optional().allow(''),
});

/**
 * Schema for PUT /api/projects/:id
 * Requirements: 2.8
 * At least one field must be provided.
 */
const updateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  description: Joi.string().allow(''),
}).min(1);

/**
 * Schema for POST /api/projects/:id/members
 * Requirements: 3.1
 * - email: valid email of the user to add
 * - role: ADMIN or MEMBER
 */
const addMemberSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid('ADMIN', 'MEMBER').required(),
});

module.exports = { createProjectSchema, updateProjectSchema, addMemberSchema };
