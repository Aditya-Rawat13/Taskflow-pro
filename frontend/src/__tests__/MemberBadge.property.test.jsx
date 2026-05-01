// Feature: taskflow-pro, Property 20: MemberBadge renders correct color class for every role
// Validates: Requirements 7.7

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import MemberBadge from '../components/MemberBadge.jsx';

const ROLES = ['ADMIN', 'MEMBER'];

const EXPECTED_COLOR = {
  ADMIN: 'blue',
  MEMBER: 'gray',
};

describe('Property 20: MemberBadge renders correct color class for every role', () => {
  it('renders the correct Tailwind color class for every Role value', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ROLES),
        (role) => {
          const { container } = render(<MemberBadge role={role} />);
          const badge = container.firstChild;
          expect(badge).not.toBeNull();

          const expectedColor = EXPECTED_COLOR[role];
          // The className should contain the expected color token (e.g. "blue", "gray")
          expect(badge.className).toContain(expectedColor);
        }
      ),
      { numRuns: 100 }
    );
  });
});
