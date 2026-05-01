const Joi = require('joi');

/**
 * Schema for POST /api/auth/register
 * Requirements: 1.7
 * - name: 2–50 characters
 * - email: valid email format
 * - password: min 8 chars, at least one uppercase letter, at least one digit
 */
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, 'uppercase letter')
    .pattern(/[0-9]/, 'digit')
    .required()
    .messages({
      'string.pattern.name': '"password" must contain at least one {#name}',
    }),
});

/**
 * Schema for POST /api/auth/login
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
