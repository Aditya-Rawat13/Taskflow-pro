/**
 * Returns Express middleware that validates `req.body` against the given Joi schema.
 * On validation failure, responds with HTTP 400 and a structured error object:
 *   { error: "Validation error", details: ["field message", ...] }
 *
 * @param {import('joi').Schema} schema - Joi schema to validate against
 */
function validateBody(schema) {
  return function (req, res, next) {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const details = error.details.map((d) => d.message);
      return res.status(400).json({ error: 'Validation error', details });
    }

    next();
  };
}

module.exports = { validateBody };
