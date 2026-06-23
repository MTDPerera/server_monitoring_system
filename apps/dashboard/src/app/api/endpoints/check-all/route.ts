import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkEndpoint } from '@/lib/checker';

export async function POST() {
  const endpoints = await prisma.endpoint.findMany();

  await Promise.all(
    endpoints.map(async (ep) => {
      const result = await checkEndpoint(
        ep.url,
        ep.method,
        (ep.headers as Record<string, string>) ?? {},
        ep.body ?? undefined,
        ep.expectedStatus,
      );
      await prisma.endpointCheck.create({
        data: {
          endpointId: ep.id,
          status: result.status,
          statusCode: result.statusCode,
          responseMs: result.responseMs,
          error: result.error,
        },
      });
    })
  );

  // Trim to last 100 checks per endpoint
  for (const ep of endpoints) {
    const old = await prisma.endpointCheck.findMany({
      where: { endpointId: ep.id },
      orderBy: { checkedAt: 'desc' },
      skip: 100,
      select: { id: true },
    });
    if (old.length > 0) {
      await prisma.endpointCheck.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
    }
  }

  return NextResponse.json({ ok: true });
}
