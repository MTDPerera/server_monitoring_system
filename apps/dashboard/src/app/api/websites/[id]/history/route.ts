import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const checks = await prisma.websiteCheck.findMany({
    where: { websiteId: id },
    orderBy: { checkedAt: 'desc' },
    take: 50,
  });
  return NextResponse.json(checks);
}
