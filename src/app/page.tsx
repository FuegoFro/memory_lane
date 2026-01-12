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
      <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <h1 className="text-3xl font-bold mb-4">Memory Lane</h1>
        <p className="text-gray-400">No memories yet. Add some photos to get started!</p>
        <Link
          href="/edit"
          className="mt-6 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
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
