const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../utils/errors');

const prisma = new PrismaClient();

/** Nested select for assignee and createdBy user fields (Req 9.3) */
const userSelect = { select: { id: true, name: true, email: true } };

/** Full task include for consistent serialization */
const taskInclude = {
  assignee: userSelect,
  createdBy: userSelect,
};

/**
 * Verifies the requesting user is a member of the project.
 * Returns the membership record or throws 403.
 */
async function assertMembership(projectId, userId) {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!membership) throw new AppError('Access denied', 403);
  return membership;
}

/**
 * GET /api/projects/:projectId/tasks
 * Supports optional query filters: status, priority, assigneeId
 * Requirements: 4.8
 */
async function list(req, res, next) {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    await assertMembership(projectId, userId);

    const { status, priority, assigneeId } = req.query;

    const where = { projectId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;

    const tasks = await prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json({ tasks });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects/:projectId/tasks
 * Admin only (enforced by requireRole middleware).
 * Requirements: 4.1, 4.2, 4.3
 */
async function create(req, res, next) {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { title, description, priority, dueDate, assigneeId } = req.body;

    // Validate assigneeId is a project member (Req 4.2)
    if (assigneeId) {
      const assigneeMembership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: assigneeId } },
      });
      if (!assigneeMembership) {
        throw new AppError('assigneeId must be a member of this project', 400);
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        projectId,
        assigneeId: assigneeId || null,
        createdById: userId,
      },
      include: taskInclude,
    });

    return res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:projectId/tasks/:taskId
 * Any project member can view a task.
 * Requirements: 4.1
 */
async function getById(req, res, next) {
  try {
    const { projectId, taskId } = req.params;
    const userId = req.user.id;

    await assertMembership(projectId, userId);

    const task = await prisma.task.findFirst({
      where: { id: taskId, projectId },
      include: taskInclude,
    });

    if (!task) throw new AppError('Task not found', 404);

    return res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/projects/:projectId/tasks/:taskId
 * Admin only (enforced by requireRole middleware).
 * Requirements: 4.4
 */
async function update(req, res, next) {
  try {
    const { projectId, taskId } = req.params;
    const { title, description, priority, dueDate, assigneeId } = req.body;

    // Validate assigneeId is a project member if provided (Req 4.2)
    if (assigneeId !== undefined && assigneeId !== null) {
      const assigneeMembership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: assigneeId } },
      });
      if (!assigneeMembership) {
        throw new AppError('assigneeId must be a member of this project', 400);
      }
    }

    const existing = await prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!existing) throw new AppError('Task not found', 404);

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (priority !== undefined) data.priority = priority;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined) data.assigneeId = assigneeId;

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      include: taskInclude,
    });

    return res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/projects/:projectId/tasks/:taskId/status
 * Allowed for Admin or the task's assignee. (Req 4.5, 4.6)
 * Requirements: 4.5, 4.6
 */
async function updateStatus(req, res, next) {
  try {
    const { projectId, taskId } = req.params;
    const userId = req.user.id;
    const { status } = req.body;

    const membership = await assertMembership(projectId, userId);

    const existing = await prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!existing) throw new AppError('Task not found', 404);

    // Only Admin or the task's assignee may update status (Req 4.5, 4.6)
    const isAdmin = membership.role === 'ADMIN';
    const isAssignee = existing.assigneeId === userId;

    if (!isAdmin && !isAssignee) {
      throw new AppError('Insufficient permissions', 403);
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status },
      include: taskInclude,
    });

    return res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/projects/:projectId/tasks/:taskId
 * Admin only (enforced by requireRole middleware).
 * Requirements: 4.7
 */
async function remove(req, res, next) {
  try {
    const { projectId, taskId } = req.params;

    const existing = await prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!existing) throw new AppError('Task not found', 404);

    await prisma.task.delete({ where: { id: taskId } });

    return res.status(200).json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, getById, update, updateStatus, remove };
