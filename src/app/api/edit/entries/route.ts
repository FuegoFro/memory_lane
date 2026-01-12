import { NextResponse } from 'next/server';
import { getAllEntries } from '@/lib/entries';

export async function GET() {
  try {
    const entries = getAllEntries();
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Failed to fetch entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}
