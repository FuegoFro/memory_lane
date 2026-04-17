import { notFound } from 'next/navigation';
import { getEntryById } from '@/lib/entries';
import { EntryEditor } from '@/components/editor';
import { Modal } from '@/components/ui/Modal';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEntryModal({ params }: PageProps) {
  const { id } = await params;
  const entry = getEntryById(id);

  if (!entry) {
    notFound();
  }

  return (
    <Modal closeHref="/edit">
      <EntryEditor entry={entry} backHref="/edit" hasNarration={!!entry.has_narration} />
    </Modal>
  );
}
