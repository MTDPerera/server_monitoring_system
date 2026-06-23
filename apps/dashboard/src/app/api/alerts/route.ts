import { NextResponse } from 'next/server';
import { getTargets } from '@/lib/prometheus';

function recommendation(instance: string, job: string): string {
  if (job.includes('node') || job.includes('server')) {
    return 'Check if Node Exporter is running: systemctl status node_exporter';
  }
  if (job.includes('blackbox') || job.includes('http')) {
    return 'Check if the service is reachable and the URL is correct';
  }
  if (job.includes('ssl') || job.includes('cert')) {
    return 'SSL certificate may have expired — verify with: openssl s_client -connect ' + instance;
  }
  return 'Check if the target service is running and accessible from Prometheus';
}

export async function GET() {
  try {
    const targets = await getTargets();
    const down = targets
      .filter((t: any) => t.health !== 'up')
      .map((t: any) => ({
        instance:       t.instance,
        job:            t.job,
        network:        t.networkLabel,
        health:         t.health,
        lastScrape:     t.lastScrape,
        lastError:      t.lastError ?? null,
        recommendation: recommendation(t.instance, t.job ?? ''),
        severity:       'critical',
      }));

    const warnings = targets
      .filter((t: any) => t.health === 'up' && t.lastError)
      .map((t: any) => ({
        instance:       t.instance,
        job:            t.job,
        network:        t.networkLabel,
        health:         'warning',
        lastScrape:     t.lastScrape,
        lastError:      t.lastError,
        recommendation: 'Target is up but had recent errors — monitor for instability',
        severity:       'warning',
      }));

    return NextResponse.json({ alerts: [...down, ...warnings], total: down.length + warnings.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
