/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { ViewerControls } from '../ViewerControls';
import { vi, describe, it, expect } from 'vitest';

describe('ViewerControls', () => {
  const defaultProps = {
    visible: true,
    currentIndex: 0,
    totalEntries: 10,
    autoAdvanceDelay: 5,
    showTitles: true,
    isNarrationPlaying: false,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToggleNarration: vi.fn(),
    onToggleAutoAdvance: vi.fn(),
    onToggleTitles: vi.fn(),
    canPlay: true,
  };

  it('renders play button when canPlay is true', () => {
    render(<ViewerControls {...defaultProps} />);
    expect(screen.getByLabelText(/Play narration/i)).toBeDefined();
  });

  it('hides play button when canPlay is false', () => {
    render(<ViewerControls {...defaultProps} canPlay={false} />);
    expect(screen.queryByLabelText(/Play narration/i)).toBeNull();
  });
});
