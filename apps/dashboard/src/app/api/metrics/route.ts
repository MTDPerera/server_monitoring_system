import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/prometheus';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'query parameter is required' }, { status: 400 });
  }

  try {
    const metrics = await queryAll(query);
    return NextResponse.json({ metrics });
  } catch {
    return NextResponse.json({ error: 'Failed to execute query' }, { status: 500 });
  }
}
