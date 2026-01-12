import { NextRequest, NextResponse } from 'next/server';
import { getEntryById, updateEntry } from '@/lib/entries';
import { getTemporaryLink, getNarrationPath } from '@/lib/dropbox';
import { transcribeAudio } from '@/lib/transcription';

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

    // Get the narration audio from Dropbox
    const narrationPath = getNarrationPath(entry.dropbox_path);
    let link: string;

    try {
      link = await getTemporaryLink(narrationPath);
    } catch {
      return NextResponse.json(
        { error: 'No narration found for this entry' },
        { status: 404 }
      );
    }

    // Fetch the audio file
    const audioResponse = await fetch(link);
    if (!audioResponse.ok) {
      throw new Error('Failed to fetch audio file');
    }

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

    // Transcribe
    const transcript = await transcribeAudio(audioBuffer);

    // Save to database
    updateEntry(id, { transcript });

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Transcription failed:', error);
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    );
  }
}
