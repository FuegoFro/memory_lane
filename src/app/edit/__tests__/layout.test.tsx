/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import EditLayout from '../layout';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('EditLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  it('renders children', () => {
    render(
      <EditLayout>
        <div data-testid="child-content">Test Content</div>
      </EditLayout>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('has "Memory Lane Editor" link pointing to /edit', () => {
    render(
      <EditLayout>
        <div>Content</div>
      </EditLayout>
    );

    const editorLink = screen.getByRole('link', { name: 'Memory Lane Editor' });
    expect(editorLink).toBeInTheDocument();
    expect(editorLink).toHaveAttribute('href', '/edit');
  });

  it('has "View Slideshow" link pointing to / with target="_blank"', () => {
    render(
      <EditLayout>
        <div>Content</div>
      </EditLayout>
    );

    const slideshowLink = screen.getByRole('link', { name: 'View Slideshow' });
    expect(slideshowLink).toBeInTheDocument();
    expect(slideshowLink).toHaveAttribute('href', '/');
    expect(slideshowLink).toHaveAttribute('target', '_blank');
  });

  it('has a Logout button', () => {
    render(
      <EditLayout>
        <div>Content</div>
      </EditLayout>
    );

    const logoutButton = screen.getByRole('button', { name: 'Logout' });
    expect(logoutButton).toBeInTheDocument();
  });

  it('logout button calls POST /api/auth/logout and navigates to /login', async () => {
    render(
      <EditLayout>
        <div>Content</div>
      </EditLayout>
    );

    const logoutButton = screen.getByRole('button', { name: 'Logout' });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('has dark theme styling with bg-gray-900 for page and bg-gray-800 for nav', () => {
    const { container } = render(
      <EditLayout>
        <div>Content</div>
      </EditLayout>
    );

    // Check the outer div has bg-gray-900
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('bg-gray-900');

    // Check the nav has bg-gray-800
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('bg-gray-800');
  });
});
