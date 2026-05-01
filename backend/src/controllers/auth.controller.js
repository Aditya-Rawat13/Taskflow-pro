const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { signToken } = require('../utils/jwt');
const { AppError } = require('../utils/errors');

const prisma = new PrismaClient();

/**
 * Strips the password field from a user object before sending to client.
 */
function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

/**
 * POST /api/auth/register
 * Requirements: 1.1, 1.2
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Check for duplicate email (Req 1.2)
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('Email already in use', 409);
    }

    // Hash password with bcrypt saltRounds 12 (Req 1.1, 8.1)
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    const token = signToken({ id: user.id, email: user.email, name: user.name });

    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Requirements: 1.3, 1.4
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Generic 401 — do not distinguish between unknown email and wrong password (Req 1.4)
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = signToken({ id: user.id, email: user.email, name: user.name });

    return res.status(200).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Requirements: 1.5
 * req.user is attached by the authenticate middleware.
 */
async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
