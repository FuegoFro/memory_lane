import { NextRequest, NextResponse } from 'next/server';
import { getEntryById, updateEntry } from '@/lib/entries';
import { uploadNarration, deleteNarration } from '@/lib/dropbox';

export async function POST(
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

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadNarration(entry.dropbox_path, buffer);
    updateEntry(id, { has_narration: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Narration upload failed:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await deleteNarration(entry.dropbox_path);
    updateEntry(id, { transcript: null, has_narration: false });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Narration delete failed:', error);
    return NextResponse.json(
      { error: 'Delete failed' },
      { status: 500 }
    );
  }
}
