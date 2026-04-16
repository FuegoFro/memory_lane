/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StageSection } from '../StageSection';

describe('StageSection', () => {
  const defaultProps = {
    status: 'active' as const,
    count: 5,
    collapsed: false,
    onToggleCollapse: vi.fn(),
    onSelectAll: vi.fn(),
  };

  it('renders section label for active status', () => {
    render(<StageSection {...defaultProps} status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders section label for staging status', () => {
    render(<StageSection {...defaultProps} status="staging" />);
    expect(screen.getByText('Staging')).toBeInTheDocument();
  });

  it('renders section label for disabled status', () => {
    render(<StageSection {...defaultProps} status="disabled" />);
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('renders count badge', () => {
    render(<StageSection {...defaultProps} count={12} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows children when expanded', () => {
    render(
      <StageSection {...defaultProps} collapsed={false}>
        <div>grid content</div>
      </StageSection>
    );
    expect(screen.getByText('grid content')).toBeInTheDocument();
  });

  it('hides children when collapsed', () => {
    render(
      <StageSection {...defaultProps} collapsed={true}>
        <div>grid content</div>
      </StageSection>
    );
    expect(screen.queryByText('grid content')).not.toBeInTheDocument();
  });

  it('calls onToggleCollapse when toggle button is clicked', () => {
    const onToggleCollapse = vi.fn();
    render(<StageSection {...defaultProps} onToggleCollapse={onToggleCollapse} />);
    fireEvent.click(screen.getByRole('button', { name: /collapse active section/i }));
    expect(onToggleCollapse).toHaveBeenCalledOnce();
  });

  it('calls onSelectAll when Select all is clicked', () => {
    const onSelectAll = vi.fn();
    render(<StageSection {...defaultProps} onSelectAll={onSelectAll} />);
    fireEvent.click(screen.getByRole('button', { name: /select all/i }));
    expect(onSelectAll).toHaveBeenCalledOnce();
  });

  it('shows drag hint for active section only', () => {
    const { rerender } = render(<StageSection {...defaultProps} status="active" />);
    expect(screen.getByText('(drag to reorder)')).toBeInTheDocument();

    rerender(<StageSection {...defaultProps} status="staging" />);
    expect(screen.queryByText('(drag to reorder)')).not.toBeInTheDocument();

    rerender(<StageSection {...defaultProps} status="disabled" />);
    expect(screen.queryByText('(drag to reorder)')).not.toBeInTheDocument();
  });

  it('shows ▼ chevron when expanded', () => {
    render(<StageSection {...defaultProps} collapsed={false} />);
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('shows ▶ chevron when collapsed', () => {
    render(<StageSection {...defaultProps} collapsed={true} />);
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('Select all button is visible even when collapsed', () => {
    render(<StageSection {...defaultProps} collapsed={true} />);
    expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
  });
});
