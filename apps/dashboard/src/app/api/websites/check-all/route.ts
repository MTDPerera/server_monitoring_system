import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkUrl, checkSslExpiry } from '@/lib/checker';

export async function POST() {
  const websites = await prisma.website.findMany();

  const results = await Promise.all(
    websites.map(async (site) => {
      const [result, sslExpiresAt] = await Promise.all([
        checkUrl(site.url, site.expectedStatus),
        checkSslExpiry(site.url),
      ]);
      if (sslExpiresAt) {
        await prisma.website.update({ where: { id: site.id }, data: { sslExpiresAt } });
      }
      await prisma.websiteCheck.create({
        data: {
          websiteId: site.id,
          status: result.status,
          statusCode: result.statusCode,
          responseMs: result.responseMs,
          error: result.error,
        },
      });
      return { id: site.id, ...result };
    })
  );

  // Keep only the last 100 checks per website to avoid DB bloat
  for (const site of websites) {
    const old = await prisma.websiteCheck.findMany({
      where: { websiteId: site.id },
      orderBy: { checkedAt: 'desc' },
      skip: 100,
      select: { id: true },
    });
    if (old.length > 0) {
      await prisma.websiteCheck.deleteMany({
        where: { id: { in: old.map((c) => c.id) } },
      });
    }
  }

  return NextResponse.json(results);
}
