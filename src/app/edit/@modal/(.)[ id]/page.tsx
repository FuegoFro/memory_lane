import { notFound } from 'next/navigation';
import { getEntryById } from '@/lib/entries';
import { EntryEditor } from '@/components/editor';
import { Modal } from '@/components/ui/Modal';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stage?: string }>;
}

export default async function EditEntryModal({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { stage } = await searchParams;
  const entry = getEntryById(id);

  if (!entry) {
    notFound();
  }

  const backHref = stage ? `/edit?stage=${stage}` : '/edit';

  return (
    <Modal closeHref={backHref}>
      <EntryEditor entry={entry} backHref={backHref} hasNarration={!!entry.has_narration} />
    </Modal>
  );
}
