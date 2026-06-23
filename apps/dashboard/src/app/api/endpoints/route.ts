import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';

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
  // Decrypt URLs before returning to the client
  const decrypted = endpoints.map(e => ({ ...e, url: decrypt(e.url) }));
  return NextResponse.json(decrypted);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, url, method = 'GET', headers = {}, body: reqBody, expectedStatus = 200, tags = [] } = body;

  if (!name || !url) {
    return NextResponse.json({ error: 'name and url are required' }, { status: 400 });
  }

  const endpoint = await prisma.endpoint.create({
    data: { name, url: encrypt(url), method, headers, body: reqBody, expectedStatus, tags },
  });
  return NextResponse.json({ ...endpoint, url }, { status: 201 });
}
