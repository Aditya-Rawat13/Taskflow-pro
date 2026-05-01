require('dotenv').config({ path: '.env.test' });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const fc = require('fast-check');
const http = require('http');
const { createTestApp } = require('./testApp');

// ---------------------------------------------------------------------------
// HTTP helper (same pattern as auth.property.test.js)
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

/** Registers a user and returns { token, user } */
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

/** Creates a project and returns the response body */
async function createProject(server, token, name) {
  return request(server, 'POST', '/api/projects', { name }, { Authorization: `Bearer ${token}` });
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Valid project name: 3–100 printable chars */
const projectNameArb = fc
  .string({ minLength: 3, maxLength: 100 })
  .filter((s) => s.trim().length >= 3);

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Project property-based tests', () => {
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
  // Property 5: Project creation auto-assigns creator as ADMIN member
  // Feature: taskflow-pro, Property 5: Project creation auto-assigns creator as ADMIN member
  // Validates: Requirements 2.1
  // -------------------------------------------------------------------------
  it('Property 5: project creation auto-assigns creator as ADMIN member', async () => {
    await fc.assert(
      fc.asyncProperty(projectNameArb, async (name) => {
        const { token, user } = await registerUser(server);

        const { status, body } = await createProject(server, token, name);
        expect(status).toBe(201);

        const projectId = body.project.id;

        // Fetch the member list for the new project
        const { body: membersBody } = await request(
          server,
          'GET',
          `/api/projects/${projectId}/members`,
          null,
          { Authorization: `Bearer ${token}` }
        );

        const creatorMember = membersBody.members.find((m) => m.userId === user.id);
        expect(creatorMember).toBeDefined();
        expect(creatorMember.role).toBe('ADMIN');
      }),
      { numRuns: 20 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 6: Project list is scoped to the requesting user's memberships
  // Feature: taskflow-pro, Property 6: Project list is scoped to the requesting user's memberships
  // Validates: Requirements 2.2
  // -------------------------------------------------------------------------
  it('Property 6: project list is scoped to the requesting user memberships', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        async (userAProjects, userBProjects) => {
          const userA = await registerUser(server, 'A');
          const userB = await registerUser(server, 'B');

          // Create projects for user A
          const userAProjectIds = [];
          for (let i = 0; i < userAProjects; i++) {
            const { body } = await createProject(server, userA.token, `ProjectA-${i}-${Date.now()}`);
            userAProjectIds.push(body.project.id);
          }

          // Create projects for user B
          const userBProjectIds = [];
          for (let i = 0; i < userBProjects; i++) {
            const { body } = await createProject(server, userB.token, `ProjectB-${i}-${Date.now()}`);
            userBProjectIds.push(body.project.id);
          }

          // User A's list should only contain user A's projects
          const { body: listA } = await request(server, 'GET', '/api/projects', null, {
            Authorization: `Bearer ${userA.token}`,
          });
          const listAIds = listA.projects.map((p) => p.id);
          for (const id of userAProjectIds) {
            expect(listAIds).toContain(id);
          }
          for (const id of userBProjectIds) {
            expect(listAIds).not.toContain(id);
          }

          // User B's list should only contain user B's projects
          const { body: listB } = await request(server, 'GET', '/api/projects', null, {
            Authorization: `Bearer ${userB.token}`,
          });
          const listBIds = listB.projects.map((p) => p.id);
          for (const id of userBProjectIds) {
            expect(listBIds).toContain(id);
          }
          for (const id of userAProjectIds) {
            expect(listBIds).not.toContain(id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 7: Task summary counts match actual task records
  // Feature: taskflow-pro, Property 7: Task summary counts match actual task records
  // Validates: Requirements 2.3
  // -------------------------------------------------------------------------
  it('Property 7: task summary counts match actual task records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          todo: fc.integer({ min: 0, max: 3 }),
          inProgress: fc.integer({ min: 0, max: 3 }),
          inReview: fc.integer({ min: 0, max: 3 }),
          done: fc.integer({ min: 0, max: 3 }),
        }),
        async ({ todo, inProgress, inReview, done }) => {
          const { token, user } = await registerUser(server);
          const { body: projBody } = await createProject(server, token, `SummaryProject-${Date.now()}`);
          const projectId = projBody.project.id;

          // Create tasks directly via Prisma for speed
          const statuses = [
            ...Array(todo).fill('TODO'),
            ...Array(inProgress).fill('IN_PROGRESS'),
            ...Array(inReview).fill('IN_REVIEW'),
            ...Array(done).fill('DONE'),
          ];
          for (const status of statuses) {
            await global.prisma.task.create({
              data: {
                title: `Task-${status}-${Date.now()}`,
                status,
                projectId,
                createdById: user.id,
              },
            });
          }

          const { body } = await request(
            server,
            'GET',
            `/api/projects/${projectId}`,
            null,
            { Authorization: `Bearer ${token}` }
          );

          const { taskSummary } = body.project;
          expect(taskSummary.todo).toBe(todo);
          expect(taskSummary.inProgress).toBe(inProgress);
          expect(taskSummary.inReview).toBe(inReview);
          expect(taskSummary.done).toBe(done);
        }
      ),
      { numRuns: 15 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 8: Non-Admin members cannot mutate projects
  // Feature: taskflow-pro, Property 8: Non-Admin members cannot mutate projects
  // Validates: Requirements 2.6
  // -------------------------------------------------------------------------
  it('Property 8: non-Admin members cannot mutate projects', async () => {
    await fc.assert(
      fc.asyncProperty(projectNameArb, async (newName) => {
        const admin = await registerUser(server, 'admin');
        const member = await registerUser(server, 'member');

        // Admin creates project
        const { body: projBody } = await createProject(server, admin.token, `MutationProject-${Date.now()}`);
        const projectId = projBody.project.id;

        // Admin adds member with MEMBER role
        await request(
          server,
          'POST',
          `/api/projects/${projectId}/members`,
          { email: member.user.email, role: 'MEMBER' },
          { Authorization: `Bearer ${admin.token}` }
        );

        // Member attempts PUT — should get 403
        const putRes = await request(
          server,
          'PUT',
          `/api/projects/${projectId}`,
          { name: newName },
          { Authorization: `Bearer ${member.token}` }
        );
        expect(putRes.status).toBe(403);

        // Member attempts DELETE — should get 403
        const delRes = await request(
          server,
          'DELETE',
          `/api/projects/${projectId}`,
          null,
          { Authorization: `Bearer ${member.token}` }
        );
        expect(delRes.status).toBe(403);
      }),
      { numRuns: 15 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 9: Project deletion cascades to tasks and memberships
  // Feature: taskflow-pro, Property 9: Project deletion cascades to tasks and memberships
  // Validates: Requirements 2.7
  // -------------------------------------------------------------------------
  it('Property 9: project deletion cascades to tasks and memberships', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 4 }),
        async (taskCount) => {
          const admin = await registerUser(server, 'admin');
          const member = await registerUser(server, 'member');

          const { body: projBody } = await createProject(server, admin.token, `CascadeProject-${Date.now()}`);
          const projectId = projBody.project.id;

          // Add a member
          await request(
            server,
            'POST',
            `/api/projects/${projectId}/members`,
            { email: member.user.email, role: 'MEMBER' },
            { Authorization: `Bearer ${admin.token}` }
          );

          // Create tasks directly via Prisma
          const taskIds = [];
          for (let i = 0; i < taskCount; i++) {
            const task = await global.prisma.task.create({
              data: {
                title: `CascadeTask-${i}`,
                projectId,
                createdById: admin.user.id,
              },
            });
            taskIds.push(task.id);
          }

          // Delete the project
          const { status } = await request(
            server,
            'DELETE',
            `/api/projects/${projectId}`,
            null,
            { Authorization: `Bearer ${admin.token}` }
          );
          expect(status).toBe(200);

          // Verify tasks are gone
          for (const taskId of taskIds) {
            const task = await global.prisma.task.findUnique({ where: { id: taskId } });
            expect(task).toBeNull();
          }

          // Verify memberships are gone
          const memberships = await global.prisma.projectMember.findMany({ where: { projectId } });
          expect(memberships).toHaveLength(0);
        }
      ),
      { numRuns: 15 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 10: Member add/remove round trip
  // Feature: taskflow-pro, Property 10: Member add/remove round trip
  // Validates: Requirements 3.1, 3.4
  // -------------------------------------------------------------------------
  it('Property 10: member add/remove round trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('ADMIN', 'MEMBER'),
        async (role) => {
          const admin = await registerUser(server, 'admin');
          const newMember = await registerUser(server, 'newmember');

          const { body: projBody } = await createProject(server, admin.token, `RoundTripProject-${Date.now()}`);
          const projectId = projBody.project.id;

          // Add the user
          const addRes = await request(
            server,
            'POST',
            `/api/projects/${projectId}/members`,
            { email: newMember.user.email, role },
            { Authorization: `Bearer ${admin.token}` }
          );
          expect(addRes.status).toBe(201);
          const memberId = addRes.body.member.id;

          // Verify present
          const { body: afterAdd } = await request(
            server,
            'GET',
            `/api/projects/${projectId}/members`,
            null,
            { Authorization: `Bearer ${admin.token}` }
          );
          expect(afterAdd.members.some((m) => m.userId === newMember.user.id)).toBe(true);

          // Remove the user
          const removeRes = await request(
            server,
            'DELETE',
            `/api/projects/${projectId}/members/${memberId}`,
            null,
            { Authorization: `Bearer ${admin.token}` }
          );
          expect(removeRes.status).toBe(200);

          // Verify absent
          const { body: afterRemove } = await request(
            server,
            'GET',
            `/api/projects/${projectId}/members`,
            null,
            { Authorization: `Bearer ${admin.token}` }
          );
          expect(afterRemove.members.some((m) => m.userId === newMember.user.id)).toBe(false);
        }
      ),
      { numRuns: 15 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 11: Member list response shape is complete
  // Feature: taskflow-pro, Property 11: Member list response shape is complete
  // Validates: Requirements 3.6
  // -------------------------------------------------------------------------
  it('Property 11: member list response shape is complete', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        async (extraMembers) => {
          const admin = await registerUser(server, 'admin');
          const { body: projBody } = await createProject(server, admin.token, `ShapeProject-${Date.now()}`);
          const projectId = projBody.project.id;

          // Add extra members
          for (let i = 0; i < extraMembers; i++) {
            const m = await registerUser(server, `extra${i}`);
            await request(
              server,
              'POST',
              `/api/projects/${projectId}/members`,
              { email: m.user.email, role: 'MEMBER' },
              { Authorization: `Bearer ${admin.token}` }
            );
          }

          const { body } = await request(
            server,
            'GET',
            `/api/projects/${projectId}/members`,
            null,
            { Authorization: `Bearer ${admin.token}` }
          );

          expect(Array.isArray(body.members)).toBe(true);
          for (const member of body.members) {
            expect(member).toHaveProperty('id');
            expect(member).toHaveProperty('name');
            expect(member).toHaveProperty('email');
            expect(member).toHaveProperty('role');
            expect(member).toHaveProperty('joinedAt');
          }
        }
      ),
      { numRuns: 15 }
    );
  });
});
