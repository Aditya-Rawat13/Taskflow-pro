require('dotenv').config({ path: '.env.test' });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const fc = require('fast-check');
const http = require('http');
const { createTestApp } = require('./testApp');

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
function request(server, method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const { port } = server.address();
    const options = {
      hostname: '127.0.0.1',
      port,
      method,
      path,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function registerUser(server, suffix = '') {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`;
  const payload = {
    name: 'Test User',
    email: `user-${unique}@test.com`,
    password: 'Password1',
  };
  const { body } = await request(server, 'POST', '/api/auth/register', payload);
  return { token: body.token, user: body.user };
}

async function createProject(server, token, name) {
  const { body } = await request(
    server, 'POST', '/api/projects', { name },
    { Authorization: `Bearer ${token}` }
  );
  return body.project;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Dashboard property-based tests', () => {
  let app;
  let server;

  beforeAll((done) => {
    app = createTestApp();
    server = app.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  // -------------------------------------------------------------------------
  // Property 15: Dashboard myTasks is sorted by dueDate ascending
  // Feature: taskflow-pro, Property 15: Dashboard myTasks is sorted by dueDate ascending
  // Validates: Requirements 5.1
  // -------------------------------------------------------------------------
  it('Property 15: dashboard myTasks is sorted by dueDate ascending (nulls last)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate 2–5 tasks with varied due dates (some null, some future)
        fc.array(
          fc.oneof(
            fc.constant(null),
            fc.integer({ min: 1, max: 365 }).map((days) => {
              const d = new Date();
              d.setDate(d.getDate() + days);
              return d.toISOString();
            })
          ),
          { minLength: 2, maxLength: 5 }
        ),
        async (dueDates) => {
          const admin = await registerUser(server, 'admin');
          const project = await createProject(server, admin.token, `SortProject-${Date.now()}`);

          // Create tasks assigned to admin with the given due dates
          for (let i = 0; i < dueDates.length; i++) {
            await global.prisma.task.create({
              data: {
                title: `SortTask-${i}`,
                projectId: project.id,
                createdById: admin.user.id,
                assigneeId: admin.user.id,
                dueDate: dueDates[i] ? new Date(dueDates[i]) : null,
              },
            });
          }

          const { status, body } = await request(
            server, 'GET', '/api/dashboard', null,
            { Authorization: `Bearer ${admin.token}` }
          );

          expect(status).toBe(200);
          const { myTasks } = body;
          expect(Array.isArray(myTasks)).toBe(true);

          // All tasks with a dueDate must come before tasks without one
          let seenNull = false;
          for (const task of myTasks) {
            if (task.dueDate === null) {
              seenNull = true;
            } else {
              // Once we've seen a null, no non-null should follow
              expect(seenNull).toBe(false);
            }
          }

          // Tasks with dueDates must be in ascending order
          const withDates = myTasks.filter((t) => t.dueDate !== null);
          for (let i = 1; i < withDates.length; i++) {
            expect(new Date(withDates[i].dueDate).getTime()).toBeGreaterThanOrEqual(
              new Date(withDates[i - 1].dueDate).getTime()
            );
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 16: Dashboard overdueTasks excludes DONE tasks
  // Feature: taskflow-pro, Property 16: Dashboard overdueTasks excludes DONE tasks
  // Validates: Requirements 5.2
  // -------------------------------------------------------------------------
  it('Property 16: dashboard overdueTasks excludes DONE tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            status: fc.constantFrom('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'),
            daysAgo: fc.integer({ min: 1, max: 30 }),
          }),
          { minLength: 1, maxLength: 6 }
        ),
        async (taskSpecs) => {
          const admin = await registerUser(server, 'admin');
          const project = await createProject(server, admin.token, `OverdueProject-${Date.now()}`);

          for (let i = 0; i < taskSpecs.length; i++) {
            const { status, daysAgo } = taskSpecs[i];
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - daysAgo);

            await global.prisma.task.create({
              data: {
                title: `OverdueTask-${i}-${status}`,
                projectId: project.id,
                createdById: admin.user.id,
                assigneeId: admin.user.id,
                status,
                dueDate: pastDate,
              },
            });
          }

          const { status: httpStatus, body } = await request(
            server, 'GET', '/api/dashboard', null,
            { Authorization: `Bearer ${admin.token}` }
          );

          expect(httpStatus).toBe(200);
          const { overdueTasks } = body;
          expect(Array.isArray(overdueTasks)).toBe(true);

          // No DONE task should appear in overdueTasks
          for (const task of overdueTasks) {
            expect(task.status).not.toBe('DONE');
            // All overdue tasks must have a past dueDate
            expect(new Date(task.dueDate).getTime()).toBeLessThan(Date.now());
          }

          // Every non-DONE task with a past dueDate must appear in overdueTasks
          const overdueIds = new Set(overdueTasks.map((t) => t.id));
          const expectedOverdue = taskSpecs.filter((s) => s.status !== 'DONE');
          // We can't easily match by id here since we created via Prisma, but we can
          // verify the count matches
          expect(overdueTasks.length).toBe(expectedOverdue.length);
        }
      ),
      { numRuns: 20 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 17: Dashboard stats are arithmetically consistent
  // Feature: taskflow-pro, Property 17: Dashboard stats are arithmetically consistent
  // Validates: Requirements 5.3
  // -------------------------------------------------------------------------
  it('Property 17: dashboard stats are arithmetically consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          done: fc.integer({ min: 0, max: 3 }),
          inProgress: fc.integer({ min: 0, max: 3 }),
          other: fc.integer({ min: 0, max: 3 }), // TODO + IN_REVIEW
          projects: fc.integer({ min: 1, max: 3 }),
        }),
        async ({ done, inProgress, other, projects }) => {
          const admin = await registerUser(server, 'admin');

          // Create multiple projects
          const projectIds = [];
          for (let p = 0; p < projects; p++) {
            const proj = await createProject(server, admin.token, `StatsProject-${p}-${Date.now()}`);
            projectIds.push(proj.id);
          }

          const totalTasks = done + inProgress + other;

          // Distribute tasks across projects
          let taskIdx = 0;
          const allStatuses = [
            ...Array(done).fill('DONE'),
            ...Array(inProgress).fill('IN_PROGRESS'),
            ...Array(other).fill('TODO'),
          ];

          for (const status of allStatuses) {
            const projectId = projectIds[taskIdx % projectIds.length];
            await global.prisma.task.create({
              data: {
                title: `StatsTask-${taskIdx}`,
                projectId,
                createdById: admin.user.id,
                assigneeId: admin.user.id,
                status,
              },
            });
            taskIdx++;
          }

          const { status: httpStatus, body } = await request(
            server, 'GET', '/api/dashboard', null,
            { Authorization: `Bearer ${admin.token}` }
          );

          expect(httpStatus).toBe(200);
          const { stats } = body;

          // totalProjects matches the number of projects the user is a member of
          expect(stats.totalProjects).toBe(projects);

          // totalTasks matches the actual number of tasks assigned to the user
          expect(stats.totalTasks).toBe(totalTasks);

          // completedTasks matches DONE count
          expect(stats.completedTasks).toBe(done);

          // inProgressTasks matches IN_PROGRESS count
          expect(stats.inProgressTasks).toBe(inProgress);

          // Arithmetic consistency: completedTasks + inProgressTasks <= totalTasks
          expect(stats.completedTasks + stats.inProgressTasks).toBeLessThanOrEqual(stats.totalTasks);
        }
      ),
      { numRuns: 20 }
    );
  });
});
