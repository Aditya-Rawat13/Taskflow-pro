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
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
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

describe('Error and security property-based tests', () => {
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
  // Property 21: All API responses include helmet security headers
  // Feature: taskflow-pro, Property 21: All API responses include helmet security headers
  // Validates: Requirements 8.4
  // -------------------------------------------------------------------------
  it('Property 21: all API responses include helmet security headers', async () => {
    // Sample of endpoints covering auth, projects, tasks, dashboard, and error paths
    const endpoints = [
      { method: 'POST', path: '/api/auth/login', body: { email: 'x@x.com', password: 'wrong' } },
      { method: 'POST', path: '/api/auth/register', body: { email: 'bad' } },
      { method: 'GET', path: '/api/auth/me', body: null },
      { method: 'GET', path: '/api/projects', body: null },
      { method: 'GET', path: '/api/dashboard', body: null },
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...endpoints),
        async (endpoint) => {
          const { headers } = await request(server, endpoint.method, endpoint.path, endpoint.body);

          // helmet sets X-Content-Type-Options on every response (Req 8.4)
          expect(headers['x-content-type-options']).toBeDefined();
          expect(headers['x-content-type-options']).toBe('nosniff');
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 22: Error responses always conform to the standard error shape
  // Feature: taskflow-pro, Property 22: Error responses always conform to the standard error shape
  // Validates: Requirements 8.6, 9.1
  // -------------------------------------------------------------------------
  it('Property 22: error responses always conform to the standard error shape', async () => {
    // Trigger various error conditions and verify the response shape
    const errorScenarios = [
      // 400 — validation failure
      {
        method: 'POST',
        path: '/api/auth/register',
        body: { name: 'A', email: 'not-an-email', password: 'weak' },
        expectedStatus: 400,
      },
      // 401 — missing token on protected route
      {
        method: 'GET',
        path: '/api/auth/me',
        body: null,
        expectedStatus: 401,
      },
      // 401 — invalid credentials
      {
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'nobody@test.com', password: 'Password1' },
        expectedStatus: 401,
      },
      // 403 — accessing a project without membership
      {
        method: 'GET',
        path: '/api/projects/00000000-0000-0000-0000-000000000000',
        body: null,
        expectedStatus: 401, // no token → 401 before 403
      },
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...errorScenarios),
        async (scenario) => {
          const { status, body } = await request(server, scenario.method, scenario.path, scenario.body);

          // Must be an error status
          expect(status).toBeGreaterThanOrEqual(400);

          // Body must be an object with an "error" string field (Req 9.1)
          expect(typeof body).toBe('object');
          expect(body).not.toBeNull();
          expect(typeof body.error).toBe('string');

          // Must NOT contain password or stack fields (Req 8.6)
          expect(body).not.toHaveProperty('password');
          expect(body).not.toHaveProperty('stack');
        }
      ),
      { numRuns: 100 }
    );
  });
});
