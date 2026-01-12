import { NextRequest, NextResponse } from 'next/server';
import { getEntryById } from '@/lib/entries';
import { getTemporaryLink } from '@/lib/dropbox';

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

    const link = await getTemporaryLink(entry.dropbox_path);
    return NextResponse.redirect(link);
  } catch (error) {
    console.error('Failed to get media link:', error);
    return NextResponse.json(
      { error: 'Failed to get media' },
      { status: 500 }
    );
  }
}
