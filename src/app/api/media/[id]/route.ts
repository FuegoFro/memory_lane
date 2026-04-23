import { NextRequest, NextResponse } from 'next/server';
import { getEntryById } from '@/lib/entries';
import { getTemporaryLink, getThumbnail } from '@/lib/dropbox';

const SUPPORTED_SIZES = [
  'w32h32', 'w64h64', 'w128h128', 'w256h256', 
  'w480h320', 'w640h480', 'w960h640', 'w1024h768', 'w2048h1536'
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const size = searchParams.get('size');
    
    const entry = getEntryById(id);

    if (!entry || entry.disabled) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    if (size && SUPPORTED_SIZES.includes(size)) {
      const { data } = await getThumbnail(entry.dropbox_path, size);
      
      return new NextResponse(data, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        },
      });
    }

    const link = await getTemporaryLink(entry.dropbox_path);
    return NextResponse.redirect(link);
  } catch (error) {
    console.error('Failed to get media:', error);
    return NextResponse.json(
      { error: 'Failed to get media' },
      { status: 500 }
    );
  }
}
