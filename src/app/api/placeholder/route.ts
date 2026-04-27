import { NextResponse } from 'next/server';

/** Unguarded placeholder route for future account/org flows. */
export async function GET() {
  return NextResponse.json({ ok: true, message: 'placeholder' });
}
