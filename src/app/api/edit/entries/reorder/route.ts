import { NextRequest, NextResponse } from 'next/server';
import { reorderEntries, getActiveEntries } from '@/lib/entries';

export async function PUT(request: NextRequest) {
  try {
    const { orderedIds } = await request.json();

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: 'orderedIds must be an array' },
        { status: 400 }
      );
    }

    reorderEntries(orderedIds);
    const entries = getActiveEntries();

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Reorder failed:', error);
    return NextResponse.json(
      { error: 'Reorder failed' },
      { status: 500 }
    );
  }
}
