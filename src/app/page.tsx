import Link from 'next/link';
import { Slideshow } from '@/components/viewer';
import { getActiveEntries } from '@/lib/entries';
import { getViewerSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const entries = getActiveEntries();
  const settings = getViewerSettings();

  if (entries.length === 0) {
    return (
      <div
        className="h-screen flex flex-col items-center justify-center"
        style={{ background: 'var(--color-paper)', color: 'var(--color-ink)' }}
      >
        <h1
          className="text-4xl mb-4"
          style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
        >
          Memory Lane
        </h1>
        <p
          className="mb-8"
          style={{ color: 'var(--color-ink3)', fontFamily: 'var(--font-news)', fontStyle: 'italic' }}
        >
          No memories yet. Add some photos to get started!
        </p>
        <Link
          href="/edit"
          className="px-6 py-2 rounded-full font-medium transition-all"
          style={{
            background: 'var(--color-ink)',
            color: 'var(--color-paper)',
            fontSize: 12,
            fontFamily: 'var(--font-sans)',
            textDecoration: 'none',
          }}
        >
          Go to Editor
        </Link>
      </div>
    );
  }

  return (
    <Slideshow
      entries={entries}
      initialAutoAdvance={settings.autoAdvanceDelay}
      initialShowTitles={settings.showTitles}
    />
  );
}
