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

async function addMemberDirect(projectId, userId, role = 'MEMBER') {
  return global.prisma.projectMember.create({
    data: { projectId, userId, role },
  });
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Valid task title: 3–100 printable ASCII chars (avoids null bytes and control chars that Joi rejects) */
const taskTitleArb = fc
  .stringMatching(/^[\x20-\x7E]{3,100}$/)
  .filter((s) => s.trim().length >= 3);

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Serialization property-based tests', () => {
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
  // Property 23: Task response includes nested assignee and createdBy objects
  // Feature: taskflow-pro, Property 23: Task response includes nested assignee and createdBy objects
  // Validates: Requirements 9.3
  // -------------------------------------------------------------------------
  it('Property 23: task response includes nested assignee and createdBy objects', async () => {
    await fc.assert(
      fc.asyncProperty(taskTitleArb, async (title) => {
        // Admin creates the project and a second user is added as a member/assignee
        const admin = await registerUser(server, 'admin');
        const assignee = await registerUser(server, 'assignee');
        const project = await createProject(server, admin.token, `SerialProject-${Date.now()}`);

        // Add assignee as a member so they can be assigned tasks
        await addMemberDirect(project.id, assignee.user.id, 'MEMBER');

        // Create a task with the assignee set
        const futureDue = new Date();
        futureDue.setDate(futureDue.getDate() + 7);

        const { status, body } = await request(
          server,
          'POST',
          `/api/projects/${project.id}/tasks`,
          {
            title,
            assigneeId: assignee.user.id,
            dueDate: futureDue.toISOString(),
          },
          { Authorization: `Bearer ${admin.token}` }
        );

        expect(status).toBe(201);
        const task = body.task;
        expect(task).toBeDefined();

        // assignee nested object must have id, name, email (Req 9.3)
        expect(task.assignee).toBeDefined();
        expect(typeof task.assignee.id).toBe('string');
        expect(typeof task.assignee.name).toBe('string');
        expect(typeof task.assignee.email).toBe('string');
        expect(task.assignee.id).toBe(assignee.user.id);

        // createdBy nested object must have id, name, email (Req 9.3)
        expect(task.createdBy).toBeDefined();
        expect(typeof task.createdBy.id).toBe('string');
        expect(typeof task.createdBy.name).toBe('string');
        expect(typeof task.createdBy.email).toBe('string');
        expect(task.createdBy.id).toBe(admin.user.id);

        // Neither nested object should expose a password field
        expect(task.assignee).not.toHaveProperty('password');
        expect(task.createdBy).not.toHaveProperty('password');
      }),
      { numRuns: 10 }
    );
  });
});
