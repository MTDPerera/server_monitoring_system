import { NextResponse } from 'next/server';
import { getServerMetrics } from '@/lib/prometheus';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instance = searchParams.get('instance');
  const network = searchParams.get('network');

  if (!instance || !network) {
    return NextResponse.json({ error: 'instance and network are required' }, { status: 400 });
  }

  try {
    const metrics = await getServerMetrics(instance, network);
    return NextResponse.json(metrics);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch metrics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
