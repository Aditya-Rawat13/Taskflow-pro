const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/** Nested select for user fields in task responses (Req 9.3) */
const userSelect = { select: { id: true, name: true, email: true } };

const taskInclude = {
  assignee: userSelect,
  createdBy: userSelect,
  project: { select: { id: true, name: true } },
};

/**
 * GET /api/dashboard
 * Returns aggregated data for the authenticated user:
 *   - myTasks: all tasks assigned to the user, sorted by dueDate ASC (nulls last)
 *   - overdueTasks: tasks where dueDate < now AND status != DONE
 *   - stats: totalProjects, totalTasks, completedTasks, inProgressTasks
 *   - recentProjects: last 3 projects the user is a member of, by updatedAt DESC
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const now = new Date();

    // All tasks assigned to the user across all projects (Req 5.1)
    const allAssignedTasks = await prisma.task.findMany({
      where: { assigneeId: userId },
      include: taskInclude,
      orderBy: [
        // nulls last: tasks with dueDate come first sorted ASC, then nulls
        { dueDate: 'asc' },
      ],
    });

    // Prisma sorts nulls first for asc by default in some DBs; re-sort in JS to guarantee nulls last
    const myTasks = [
      ...allAssignedTasks.filter((t) => t.dueDate !== null).sort(
        (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
      ),
      ...allAssignedTasks.filter((t) => t.dueDate === null),
    ];

    // Overdue tasks: dueDate < now AND status != DONE (Req 5.2)
    const overdueTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        dueDate: { lt: now },
        status: { not: 'DONE' },
      },
      include: taskInclude,
    });

    // Stats (Req 5.3)
    const totalProjects = await prisma.projectMember.count({ where: { userId } });
    const totalTasks = allAssignedTasks.length;
    const completedTasks = allAssignedTasks.filter((t) => t.status === 'DONE').length;
    const inProgressTasks = allAssignedTasks.filter((t) => t.status === 'IN_PROGRESS').length;

    // Recent projects: last 3 by updatedAt DESC (Req 5.4)
    const recentMemberships = await prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: {
          include: {
            _count: { select: { members: true, tasks: true } },
          },
        },
      },
      orderBy: { project: { updatedAt: 'desc' } },
      take: 3,
    });

    const recentProjects = recentMemberships.map((m) => ({
      ...m.project,
      memberCount: m.project._count.members,
      taskCount: m.project._count.tasks,
      userRole: m.role,
      _count: undefined,
    }));

    return res.status(200).json({
      myTasks,
      overdueTasks,
      stats: { totalProjects, totalTasks, completedTasks, inProgressTasks },
      recentProjects,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };
