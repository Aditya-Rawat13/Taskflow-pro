const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../utils/errors');

const prisma = new PrismaClient();

/**
 * GET /api/projects
 * Returns only projects where the requesting user is a member.
 * Includes member count and task count per project.
 * Requirements: 2.2
 */
async function list(req, res, next) {
  try {
    const userId = req.user.id;

    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: {
          include: {
            _count: { select: { members: true, tasks: true } },
          },
        },
      },
    });

    const projects = memberships.map((m) => ({
      ...m.project,
      memberCount: m.project._count.members,
      taskCount: m.project._count.tasks,
      userRole: m.role,
      _count: undefined,
    }));

    return res.status(200).json({ projects });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects
 * Creates a project and auto-assigns the creator as ADMIN member.
 * Requirements: 2.1
 */
async function create(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: userId,
        members: {
          create: { userId, role: 'ADMIN' },
        },
      },
      include: {
        _count: { select: { members: true, tasks: true } },
      },
    });

    return res.status(201).json({
      project: {
        ...project,
        memberCount: project._count.members,
        taskCount: project._count.tasks,
        _count: undefined,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:projectId
 * Returns project details, member list, and task summary counts.
 * Only accessible to project members.
 * Requirements: 2.3, 2.4
 */
async function getById(req, res, next) {
  try {
    const userId = req.user.id;
    const { projectId } = req.params;

    // Verify membership (Req 2.4)
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!membership) {
      throw new AppError('Access denied', 403);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        tasks: { select: { status: true } },
      },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Build task summary (Req 2.3)
    const taskSummary = {
      todo: project.tasks.filter((t) => t.status === 'TODO').length,
      inProgress: project.tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      inReview: project.tasks.filter((t) => t.status === 'IN_REVIEW').length,
      done: project.tasks.filter((t) => t.status === 'DONE').length,
    };

    const members = project.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    return res.status(200).json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        members,
        taskSummary,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/projects/:projectId
 * Updates project name/description. Admin only (enforced by requireRole middleware).
 * Requirements: 2.5
 */
async function update(req, res, next) {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { name, description },
    });

    return res.status(200).json({ project });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/projects/:projectId
 * Cascade-deletes all tasks and members. Admin only.
 * Requirements: 2.7
 */
async function remove(req, res, next) {
  try {
    const { projectId } = req.params;

    await prisma.project.delete({ where: { id: projectId } });

    return res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:projectId/members
 * Returns member list for a project. Accessible to any project member.
 * Requirements: 3.6
 */
async function listMembers(req, res, next) {
  try {
    const userId = req.user.id;
    const { projectId } = req.params;

    // Verify requester is a member
    const requesterMembership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!requesterMembership) {
      throw new AppError('Access denied', 403);
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const result = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    return res.status(200).json({ members: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects/:projectId/members
 * Adds a registered user to the project by email. Admin only.
 * Requirements: 3.1, 3.2, 3.3
 */
async function addMember(req, res, next) {
  try {
    const { projectId } = req.params;
    const { email, role } = req.body;

    // Look up user by email (Req 3.2)
    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) {
      throw new AppError('User not found', 404);
    }

    // Check for duplicate membership (Req 3.3)
    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: userToAdd.id } },
    });
    if (existing) {
      throw new AppError('User is already a member of this project', 409);
    }

    const member = await prisma.projectMember.create({
      data: { projectId, userId: userToAdd.id, role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json({
      member: {
        id: member.id,
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
        joinedAt: member.joinedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/projects/:projectId/members/:memberId
 * Removes a member from the project. Admin only. Cannot remove the owner.
 * Requirements: 3.4, 3.5
 */
async function removeMember(req, res, next) {
  try {
    const { projectId, memberId } = req.params;

    // Find the membership record
    const membership = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: { project: true },
    });

    if (!membership || membership.projectId !== projectId) {
      throw new AppError('Member not found', 404);
    }

    // Protect owner removal (Req 3.5)
    if (membership.userId === membership.project.ownerId) {
      throw new AppError('Cannot remove the project owner', 400);
    }

    await prisma.projectMember.delete({ where: { id: memberId } });

    return res.status(200).json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, getById, update, remove, listMembers, addMember, removeMember };
