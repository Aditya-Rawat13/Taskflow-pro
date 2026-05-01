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

async function createTask(server, token, projectId, taskData) {
  return request(
    server, 'POST', `/api/projects/${projectId}/tasks`, taskData,
    { Authorization: `Bearer ${token}` }
  );
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Valid task title: 3–200 printable chars */
const taskTitleArb = fc
  .string({ minLength: 3, maxLength: 100 })
  .filter((s) => s.trim().length >= 3);

/** Future ISO date string (1–365 days from now) */
const futureDateArb = fc
  .integer({ min: 1, max: 365 })
  .map((days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  });

/** Past ISO date string (1–365 days ago) */
const pastDateArb = fc
  .integer({ min: 1, max: 365 })
  .map((days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  });

/** Valid priority values */
const priorityArb = fc.constantFrom('LOW', 'MEDIUM', 'HIGH');

/** Valid status values */
const statusArb = fc.constantFrom('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Task property-based tests', () => {
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
  // Property 12: Task creation sets createdById to the requesting user
  // Feature: taskflow-pro, Property 12: Task creation sets createdById to the requesting user
  // Validates: Requirements 4.1
  // -------------------------------------------------------------------------
  it('Property 12: task creation sets createdById to the requesting user', async () => {
    await fc.assert(
      fc.asyncProperty(taskTitleArb, async (title) => {
        const admin = await registerUser(server, 'admin');
        const project = await createProject(server, admin.token, `TaskProject-${Date.now()}`);

        const { status, body } = await createTask(server, admin.token, project.id, { title });

        expect(status).toBe(201);
        expect(body.task).toBeDefined();
        expect(body.task.createdById).toBe(admin.user.id);
        // Also verify nested createdBy object (Req 9.3)
        expect(body.task.createdBy).toBeDefined();
        expect(body.task.createdBy.id).toBe(admin.user.id);
      }),
      { numRuns: 20 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 13: Past due dates are rejected on task creation
  // Feature: taskflow-pro, Property 13: Past due dates are rejected on task creation
  // Validates: Requirements 4.3
  // -------------------------------------------------------------------------
  it('Property 13: past due dates are rejected on task creation', async () => {
    await fc.assert(
      fc.asyncProperty(taskTitleArb, pastDateArb, async (title, pastDate) => {
        const admin = await registerUser(server, 'admin');
        const project = await createProject(server, admin.token, `PastDateProject-${Date.now()}`);

        const { status } = await createTask(server, admin.token, project.id, {
          title,
          dueDate: pastDate,
        });

        expect(status).toBe(400);
      }),
      { numRuns: 20 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 14: Task filtering returns only matching tasks
  // Feature: taskflow-pro, Property 14: Task filtering returns only matching tasks
  // Validates: Requirements 4.8
  // -------------------------------------------------------------------------
  it('Property 14: task filtering returns only matching tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        statusArb,
        priorityArb,
        async (filterStatus, filterPriority) => {
          const admin = await registerUser(server, 'admin');
          const project = await createProject(server, admin.token, `FilterProject-${Date.now()}`);

          // Create tasks with all combinations of status/priority via Prisma
          const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
          const priorities = ['LOW', 'MEDIUM', 'HIGH'];
          for (const s of statuses) {
            for (const p of priorities) {
              await global.prisma.task.create({
                data: {
                  title: `Task-${s}-${p}`,
                  status: s,
                  priority: p,
                  projectId: project.id,
                  createdById: admin.user.id,
                },
              });
            }
          }

          // Filter by status
          const { body: statusFiltered } = await request(
            server,
            'GET',
            `/api/projects/${project.id}/tasks?status=${filterStatus}`,
            null,
            { Authorization: `Bearer ${admin.token}` }
          );
          expect(Array.isArray(statusFiltered.tasks)).toBe(true);
          for (const task of statusFiltered.tasks) {
            expect(task.status).toBe(filterStatus);
          }

          // Filter by priority
          const { body: priorityFiltered } = await request(
            server,
            'GET',
            `/api/projects/${project.id}/tasks?priority=${filterPriority}`,
            null,
            { Authorization: `Bearer ${admin.token}` }
          );
          expect(Array.isArray(priorityFiltered.tasks)).toBe(true);
          for (const task of priorityFiltered.tasks) {
            expect(task.priority).toBe(filterPriority);
          }

          // Filter by both status and priority
          const { body: combined } = await request(
            server,
            'GET',
            `/api/projects/${project.id}/tasks?status=${filterStatus}&priority=${filterPriority}`,
            null,
            { Authorization: `Bearer ${admin.token}` }
          );
          expect(Array.isArray(combined.tasks)).toBe(true);
          for (const task of combined.tasks) {
            expect(task.status).toBe(filterStatus);
            expect(task.priority).toBe(filterPriority);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
