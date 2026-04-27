/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { NarrationPlayer } from '../NarrationPlayer';

describe('NarrationPlayer', () => {
  beforeEach(() => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it('recovers from error state when entryId changes', () => {
    const onEnded = vi.fn();
    const { container, rerender } = render(
      <NarrationPlayer
        entryId="e1"
        isPlaying={false}
        isVideo={false}
        initialHasNarration={true}
        onEnded={onEnded}
        visible={true}
      />
    );

    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();

    // Trigger error
    fireEvent.error(audio!);
    
    // Component should now be null (hidden)
    expect(container.firstChild).toBeNull();

    // Change entryId
    rerender(
      <NarrationPlayer
        entryId="e2"
        isPlaying={false}
        isVideo={false}
        initialHasNarration={true}
        onEnded={onEnded}
        visible={true}
      />
    );

    // Should recover and show the player again
    expect(container.firstChild).not.toBeNull();
  });

  it('is hidden when initialHasNarration is false', () => {
    const { container } = render(
      <NarrationPlayer
        entryId="e1"
        isPlaying={false}
        isVideo={false}
        initialHasNarration={false}
        onEnded={vi.fn()}
        visible={true}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('applies idle class when visible is false', () => {
    const { container, rerender } = render(
      <NarrationPlayer
        entryId="e1"
        isPlaying={false}
        isVideo={false}
        initialHasNarration={true}
        onEnded={vi.fn()}
        visible={true}
      />
    );
    expect(container.firstChild).not.toHaveClass('idle');

    rerender(
      <NarrationPlayer
        entryId="e1"
        isPlaying={false}
        isVideo={false}
        initialHasNarration={true}
        onEnded={vi.fn()}
        visible={false}
      />
    );
    expect(container.firstChild).toHaveClass('idle');
  });
});
