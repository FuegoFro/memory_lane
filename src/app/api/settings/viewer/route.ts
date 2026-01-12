import { NextResponse } from 'next/server';
import { getViewerSettings } from '@/lib/settings';

export async function GET() {
  try {
    const settings = getViewerSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}
