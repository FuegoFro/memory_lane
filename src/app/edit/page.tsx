import { EntryGrid } from '@/components/editor/EntryGrid';
import { getAllEntries } from '@/lib/entries';

export const dynamic = 'force-dynamic';

export default function EditPage() {
  const entries = getAllEntries();
  return <EntryGrid initialEntries={entries} />;
}
