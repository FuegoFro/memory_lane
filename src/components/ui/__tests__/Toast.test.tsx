/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ToastProvider, useToast } from '../Toast';

function Trigger({ msg, kind }: { msg: string; kind?: 'info' | 'ok' | 'error' }) {
  const { showToast } = useToast();
  return <button onClick={() => showToast(msg, kind)}>fire</button>;
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no toast has fired', () => {
    render(
      <ToastProvider>
        <div>content</div>
      </ToastProvider>
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows a toast when showToast is called', () => {
    render(
      <ToastProvider>
        <Trigger msg="Synced" kind="ok" />
      </ToastProvider>
    );
    act(() => {
      screen.getByText('fire').click();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Synced');
  });

  it('auto-dismisses after 2.6 seconds', () => {
    render(
      <ToastProvider>
        <Trigger msg="Gone" />
      </ToastProvider>
    );
    act(() => {
      screen.getByText('fire').click();
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('applies ok kind background', () => {
    render(
      <ToastProvider>
        <Trigger msg="ok" kind="ok" />
      </ToastProvider>
    );
    act(() => {
      screen.getByText('fire').click();
    });
    const toast = screen.getByRole('status') as HTMLElement;
    expect(toast.style.background).toBe('rgb(74, 93, 58)');
  });

  it('throws when useToast is called outside provider', () => {
    function Outside() {
      useToast();
      return null;
    }
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Outside />)).toThrow(/ToastProvider/);
    err.mockRestore();
  });
});
