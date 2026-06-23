import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const endpoints = await prisma.endpoint.findMany({
    include: {
      checks: {
        orderBy: { checkedAt: 'desc' },
        take: 20,
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(endpoints);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, url, method = 'GET', headers = {}, body: reqBody, expectedStatus = 200, tags = [] } = body;

  if (!name || !url) {
    return NextResponse.json({ error: 'name and url are required' }, { status: 400 });
  }

  const endpoint = await prisma.endpoint.create({
    data: { name, url, method, headers, body: reqBody, expectedStatus, tags },
  });
  return NextResponse.json(endpoint, { status: 201 });
}
