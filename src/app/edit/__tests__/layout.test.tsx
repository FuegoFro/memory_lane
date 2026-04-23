/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import EditLayout from '../layout';

describe('EditLayout', () => {
  it('renders children', () => {
    render(
      <EditLayout>
        <div data-testid="child-content">Test Content</div>
      </EditLayout>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('has paper theme styling with bg-[var(--color-paper)]', () => {
    const { container } = render(
      <EditLayout>
        <div>Content</div>
      </EditLayout>
    );

    // Check the outer div has bg-[var(--color-paper)]
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('bg-[var(--color-paper)]');
  });
});
