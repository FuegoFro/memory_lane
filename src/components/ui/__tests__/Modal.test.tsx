/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Modal } from '../Modal';

// jsdom doesn't implement HTMLDialogElement.showModal/close — stub them.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

describe('Modal', () => {
  it('renders children', () => {
    render(
      <Modal onClose={vi.fn()}>
        <p>Hello modal</p>
      </Modal>
    );
    expect(screen.getByText('Hello modal')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <p>Body</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when dialog fires its close event', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal onClose={onClose}>
        <p>Body</p>
      </Modal>
    );
    const dialog = container.querySelector('dialog')!;
    fireEvent(dialog, new Event('close'));
    expect(onClose).toHaveBeenCalled();
  });
});
