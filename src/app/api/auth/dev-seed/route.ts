import { NextResponse } from 'next/server'
import { createEntry, deleteEntry } from '@/lib/entries'

// Dev-only endpoint for agent-browser test data management.
// Creates a throwaway entry and returns its ID so tests don't pollute the dev database.
// DELETE removes it by ID when the test is done.

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const entry = createEntry('/__test__/agent-browser-test.jpg')
  return NextResponse.json({ id: entry.id })
}

export async function DELETE(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { id } = await request.json()
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  deleteEntry(id)
  return NextResponse.json({ success: true })
}
