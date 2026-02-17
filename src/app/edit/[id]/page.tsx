import { notFound } from 'next/navigation';
import { getEntryById } from '@/lib/entries';
import { getTemporaryLink, getNarrationPath } from '@/lib/dropbox';
import { EntryEditor } from '@/components/editor';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

async function checkNarrationExists(dropboxPath: string): Promise<boolean> {
  try {
    await getTemporaryLink(getNarrationPath(dropboxPath));
    return true;
  } catch {
    return false;
  }
}

export default async function EditEntryPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  const entry = getEntryById(id);

  if (!entry) {
    notFound();
  }

  const hasNarration = await checkNarrationExists(entry.dropbox_path);
  const backHref = from ? `/edit?stage=${from}` : '/edit';

  return <EntryEditor entry={entry} backHref={backHref} hasNarration={hasNarration} />;
}
