import { NextResponse } from 'next/server';
import { getNetworkStats } from '@/lib/prometheus';

export async function GET() {
  const networks = await getNetworkStats();
  return NextResponse.json({ networks });
}
