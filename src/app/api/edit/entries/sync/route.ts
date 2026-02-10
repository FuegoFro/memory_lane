import { NextResponse } from 'next/server';
import { syncFromDropbox } from '@/lib/entries';

export async function POST() {
  try {
    const result = await syncFromDropbox();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Sync failed:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
