import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, service: 'health', ts: new Date().toISOString() });
}
