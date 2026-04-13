import { getAllEntries } from '@/lib/entries';
import { EntryGrid } from '@/components/editor/EntryGrid';

export const dynamic = 'force-dynamic';

export default function EditEntryPage() {
  const entries = getAllEntries();
  return <EntryGrid initialEntries={entries} />;
}
