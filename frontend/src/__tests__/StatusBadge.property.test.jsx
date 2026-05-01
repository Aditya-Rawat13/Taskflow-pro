// Feature: taskflow-pro, Property 19: StatusBadge renders correct color class for every status
// Validates: Requirements 7.6

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import StatusBadge from '../components/StatusBadge.jsx';

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const EXPECTED_COLOR = {
  TODO: 'gray',
  IN_PROGRESS: 'blue',
  IN_REVIEW: 'amber',
  DONE: 'green',
};

describe('Property 19: StatusBadge renders correct color class for every status', () => {
  it('renders the correct Tailwind color class for every TaskStatus value', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TASK_STATUSES),
        (status) => {
          const { container } = render(<StatusBadge status={status} />);
          const badge = container.firstChild;
          expect(badge).not.toBeNull();

          const expectedColor = EXPECTED_COLOR[status];
          // The className should contain the expected color token (e.g. "gray", "blue", "amber", "green")
          expect(badge.className).toContain(expectedColor);
        }
      ),
      { numRuns: 100 }
    );
  });
});
