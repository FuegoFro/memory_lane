import { NextRequest, NextResponse } from 'next/server';
import { getEntryById } from '@/lib/entries';
import { getTemporaryLink, getNarrationPath } from '@/lib/dropbox';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = getEntryById(id);

    if (!entry || entry.disabled) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const narrationPath = getNarrationPath(entry.dropbox_path);

    try {
      const link = await getTemporaryLink(narrationPath);
      const response = NextResponse.redirect(link);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } catch {
      // Narration doesn't exist
      return NextResponse.json(
        { error: 'No narration' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Failed to get narration link:', error);
    return NextResponse.json(
      { error: 'Failed to get narration' },
      { status: 500 }
    );
  }
}
