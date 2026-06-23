import { NextResponse } from 'next/server';
import { getServerDetail } from '@/lib/prometheus';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instance = searchParams.get('instance');
  const network = searchParams.get('network');

  if (!instance || !network) {
    return NextResponse.json({ error: 'instance and network are required' }, { status: 400 });
  }

  try {
    const detail = await getServerDetail(instance, network);
    return NextResponse.json(detail);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch detail';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
