/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SegmentedControl } from '../SegmentedControl';

const options = [
  { value: 'staging', label: 'Staging' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
] as const;

type Status = 'staging' | 'active' | 'disabled';

describe('SegmentedControl', () => {
  it('renders all options as buttons', () => {
    render(
      <SegmentedControl<Status> options={[...options]} value="active" onChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Staging' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeInTheDocument();
  });

  it('marks the current value as pressed and others as not pressed', () => {
    render(
      <SegmentedControl<Status> options={[...options]} value="active" onChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Staging' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Disabled' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the clicked option value', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl<Status> options={[...options]} value="active" onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(onChange).toHaveBeenCalledWith('disabled');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('renders as a labeled group when aria-labelledby is provided', () => {
    render(
      <div>
        <span id="my-label">Status</span>
        <SegmentedControl<Status>
          options={[...options]}
          value="staging"
          onChange={vi.fn()}
          aria-labelledby="my-label"
        />
      </div>
    );
    expect(screen.getByRole('group', { name: 'Status' })).toBeInTheDocument();
  });
});
