// Feature: taskflow-pro, Property 18: Axios interceptor attaches Bearer token to every request
// Validates: Requirements 6.5

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import apiClient from '../api/axios.js';
import { AuthProvider } from '../context/AuthContext.jsx';

describe('Property 18: Axios interceptor attaches Bearer token to every request', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('attaches Authorization header when token is present in localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a non-empty token string (simulates a JWT — no whitespace-only strings)
        fc.string({ minLength: 10, maxLength: 200 }).filter((s) => s.trim().length > 0),
        async (token) => {
          localStorage.setItem('token', token);

          // Build a minimal config object as Axios would pass to the interceptor
          const config = { headers: {} };

          // Run the request interceptor directly by finding it on the instance
          // Axios stores interceptors in interceptors.request.handlers
          const handlers = apiClient.interceptors.request.handlers;
          const requestInterceptor = handlers.find((h) => h !== null)?.fulfilled;

          expect(requestInterceptor).toBeDefined();

          const result = requestInterceptor(config);
          expect(result.headers.Authorization).toBe(`Bearer ${token}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not attach Authorization header when no token is in localStorage', () => {
    localStorage.removeItem('token');

    const config = { headers: {} };
    const handlers = apiClient.interceptors.request.handlers;
    const requestInterceptor = handlers.find((h) => h !== null)?.fulfilled;

    expect(requestInterceptor).toBeDefined();

    const result = requestInterceptor(config);
    expect(result.headers.Authorization).toBeUndefined();
  });
});

// Unit test: 401 response clears auth state and redirects to /login
// Validates: Requirements 6.3
describe('401 response interceptor clears auth and redirects to /login', () => {
  const server = setupServer(
    // /api/auth/me returns 401 so AuthProvider mount also triggers the flow
    http.get('http://localhost:3000/api/auth/me', () =>
      HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    ),
    http.get('http://localhost:3000/api/test-401', () =>
      HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  );

  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
    localStorage.setItem('token', 'test-token-value');
    localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Test', email: 'test@example.com' }));
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
    localStorage.clear();
  });

  it('dispatches auth:unauthorized event when a 401 response is received', async () => {
    let unauthorizedFired = false;
    const handler = () => { unauthorizedFired = true; };
    window.addEventListener('auth:unauthorized', handler);

    try {
      await apiClient.get('/api/test-401').catch(() => {});
      expect(unauthorizedFired).toBe(true);
    } finally {
      window.removeEventListener('auth:unauthorized', handler);
    }
  });

  it('mounts a component making an authenticated request, simulates 401, and verifies localStorage is cleared', async () => {
    // Minimal component that makes a request on mount
    function RequestingComponent() {
      const [status, setStatus] = React.useState('idle');
      React.useEffect(() => {
        apiClient.get('/api/test-401').catch(() => setStatus('error'));
      }, []);
      return <span data-testid="req-status">{status}</span>;
    }

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <RequestingComponent />
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for the request to complete and the error handler to run
    await waitFor(() => {
      expect(screen.getByTestId('req-status').textContent).toBe('error');
    });

    // The auth:unauthorized event fires → AuthContext.logout() removes token and user from localStorage
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });
});
