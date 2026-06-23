import { NextResponse } from 'next/server';
import { getTargets } from '@/lib/prometheus';

export async function GET() {
  try {
    const targets = await getTargets();
    return NextResponse.json({ targets });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 });
  }
}
