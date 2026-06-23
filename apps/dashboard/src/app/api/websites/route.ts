import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const websites = await prisma.website.findMany({
    include: {
      checks: {
        orderBy: { checkedAt: 'desc' },
        take: 20,
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  // Decrypt URLs before returning to the client
  const decrypted = websites.map(w => ({ ...w, url: decrypt(w.url) }));
  return NextResponse.json(decrypted);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, url, expectedStatus = 200, tags = [] } = body;

  if (!name || !url) {
    return NextResponse.json({ error: 'name and url are required' }, { status: 400 });
  }

  const website = await prisma.website.create({
    data: { name, url: encrypt(url), expectedStatus, tags },
  });
  return NextResponse.json({ ...website, url }, { status: 201 });
}
