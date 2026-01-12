import { NextRequest, NextResponse } from 'next/server';
import { getEntryById, updateEntry, getNextPosition } from '@/lib/entries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = getEntryById(id);

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Failed to fetch entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entry' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const entry = getEntryById(id);
    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    const updates: Parameters<typeof updateEntry>[1] = {};

    if ('title' in body) updates.title = body.title;
    if ('transcript' in body) updates.transcript = body.transcript;
    if ('disabled' in body) updates.disabled = body.disabled;

    // Handle status changes
    if ('status' in body) {
      switch (body.status) {
        case 'active':
          updates.disabled = false;
          if (entry.position === null) {
            updates.position = getNextPosition();
          }
          break;
        case 'staging':
          updates.disabled = false;
          updates.position = null;
          break;
        case 'disabled':
          updates.disabled = true;
          break;
      }
    }

    const updated = updateEntry(id, updates);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update entry:', error);
    return NextResponse.json(
      { error: 'Failed to update entry' },
      { status: 500 }
    );
  }
}
