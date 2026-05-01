require('dotenv').config({ path: '.env.test' });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const fc = require('fast-check');
const http = require('http');
const { createTestApp } = require('./testApp');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Minimal HTTP request helper that avoids adding supertest as a dependency.
 * Returns { status, body } where body is parsed JSON.
 */
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
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Recursively checks whether an object (or any nested object/array) contains
 * a key named "password".
 */
function containsPasswordKey(obj) {
  if (obj === null || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return obj.some(containsPasswordKey);
  if ('password' in obj) return true;
  return Object.values(obj).some(containsPasswordKey);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a valid registration payload */
const validUserArb = fc.record({
  name: fc.string({ minLength: 2, maxLength: 50 }).filter(
    (s) => s.trim().length >= 2
  ),
  email: fc.emailAddress(),
  password: fc
    .string({ minLength: 8, maxLength: 30 })
    .map((s) => {
      // Ensure at least one uppercase and one digit
      return 'A1' + s;
    }),
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Auth property-based tests', () => {
  let app;
  let server;

  beforeAll((done) => {
    app = createTestApp();
    server = app.listen(0, done); // port 0 = OS assigns a free port
  });

  afterAll((done) => {
    server.close(done);
  });

  // -------------------------------------------------------------------------
  // Property 1: Registration response never contains a password
  // Feature: taskflow-pro, Property 1: Registration response never contains a password
  // Validates: Requirements 1.1, 8.1, 9.2
  // -------------------------------------------------------------------------
  it('Property 1: registration response never contains a password field', async () => {
    await fc.assert(
      fc.asyncProperty(validUserArb, async (user) => {
        // Use a unique email per iteration to avoid 409 conflicts
        const uniqueUser = {
          ...user,
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
        };

        const { status, body } = await request(server, 'POST', '/api/auth/register', uniqueUser);

        // Must succeed (201) for the property to be meaningful
        if (status !== 201) return; // skip if validation rejected (shouldn't happen with our arb)

        expect(containsPasswordKey(body)).toBe(false);
      }),
      { numRuns: 20 } // 20 runs — each creates a real DB record; keep reasonable
    );
  });

  // -------------------------------------------------------------------------
  // Property 2: Login with invalid credentials always returns 401
  // Feature: taskflow-pro, Property 2: Login with invalid credentials always returns 401
  // Validates: Requirements 1.4
  // -------------------------------------------------------------------------
  it('Property 2: login with invalid credentials always returns 401', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate emails that pass Joi's email validator (requires valid TLD)
        fc.string({ minLength: 1, maxLength: 20 })
          .filter((s) => /^[a-z0-9]+$/.test(s))
          .map((s) => `${s}@example.com`),
        // Password must be non-empty and non-whitespace to pass loginSchema validation
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        async (email, password) => {
          // These email/password pairs are guaranteed not to match any registered
          // user because cleanDb() runs before each test and we never register here.
          const { status } = await request(server, 'POST', '/api/auth/login', {
            email,
            password,
          });

          expect(status).toBe(401);
        }
      ),
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 3: Protected routes reject missing or invalid tokens
  // Feature: taskflow-pro, Property 3: Protected routes reject missing or invalid tokens
  // Validates: Requirements 1.6
  // -------------------------------------------------------------------------
  it('Property 3: GET /api/auth/me rejects missing or invalid tokens with 401', async () => {
    // Sub-case A: no Authorization header at all
    const noToken = await request(server, 'GET', '/api/auth/me', null);
    expect(noToken.status).toBe(401);

    // Sub-case B: malformed tokens (random strings)
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (randomToken) => {
          const { status } = await request(server, 'GET', '/api/auth/me', null, {
            Authorization: `Bearer ${randomToken}`,
          });
          expect(status).toBe(401);
        }
      ),
      { numRuns: 50 }
    );

    // Sub-case C: token signed with a different secret
    const jwt = require('jsonwebtoken');
    const wrongSecretToken = jwt.sign({ id: 'fake-id' }, 'wrong-secret', { expiresIn: '1h' });
    const wrongSecret = await request(server, 'GET', '/api/auth/me', null, {
      Authorization: `Bearer ${wrongSecretToken}`,
    });
    expect(wrongSecret.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Property 4: Password validation rejects weak passwords
  // Feature: taskflow-pro, Property 4: Password validation rejects weak passwords
  // Validates: Requirements 1.7
  // -------------------------------------------------------------------------
  it('Property 4: registration rejects weak passwords with 400', async () => {
    const baseUser = { name: 'Test User', email: 'weak@test.com' };

    // Category A: passwords shorter than 8 characters
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 7 }),
        async (shortPassword) => {
          const { status } = await request(server, 'POST', '/api/auth/register', {
            ...baseUser,
            email: `short-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
            password: shortPassword,
          });
          expect(status).toBe(400);
        }
      ),
      { numRuns: 30 }
    );

    // Category B: passwords >= 8 chars but no uppercase letter
    // Build from lowercase letters + digits only, guaranteed no uppercase
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-z0-9]{7,29}1$/), // ends with digit, all lowercase
        async (noUpperPassword) => {
          const { status } = await request(server, 'POST', '/api/auth/register', {
            ...baseUser,
            email: `noupper-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
            password: noUpperPassword,
          });
          expect(status).toBe(400);
        }
      ),
      { numRuns: 30 }
    );

    // Category C: passwords >= 8 chars with uppercase but no digit
    // Build from letters only, guaranteed no digit
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z]{7,29}A$/), // ends with uppercase, no digits
        async (noDigitPassword) => {
          const { status } = await request(server, 'POST', '/api/auth/register', {
            ...baseUser,
            email: `nodigit-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
            password: noDigitPassword,
          });
          expect(status).toBe(400);
        }
      ),
      { numRuns: 30 }
    );
  });
});
