'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Server } from 'lucide-react';
import type { ServerMetrics, ServerDetail } from '@/lib/prometheus';

// ── Formatters ────────────────────────────────────────────────────────────────

function formatBytes(val: string | number | null): string {
  if (val === null || val === undefined) return 'N/A';
  const b = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(b)) return 'N/A';
  if (b >= 1e12) return `${(b / 1e12).toFixed(2)} TB`;
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(1)} KB`;
  return `${b.toFixed(0)} B`;
}

function formatUptime(val: string | null): string {
  if (!val) return 'N/A';
  const s = parseFloat(val);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function pct(val: string | null): number | null {
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : Math.min(Math.max(n, 0), 100);
}

function valueColor(v: number | null): string {
  if (v === null) return '#4b5563';
  if (v >= 85) return '#f87171';
  if (v >= 65) return '#facc15';
  return '#4ade80';
}

function barColor(v: number | null): string {
  if (v === null) return 'rgba(75,85,99,0.5)';
  if (v >= 85) return '#f87171';
  if (v >= 65) return '#facc15';
  return '#4ade80';
}

// ── Gauge ring ────────────────────────────────────────────────────────────────

function GaugeRing({ value }: { value: number | null }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = value !== null ? circ - (value / 100) * circ : circ;
  const color = valueColor(value);
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="mx-auto">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(34,211,238,0.08)" strokeWidth="8" />
      <circle cx="48" cy="48" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
}

function MetricCard({ title, value, subtitle, extra }: {
  title: string; value: number | null; subtitle?: string; extra?: string;
}) {
  const color = valueColor(value);
  return (
    <div className="relative flex flex-col items-center text-center p-6 rounded-lg"
      style={{ background: 'rgba(34,211,238,0.03)', border: '1px solid rgba(34,211,238,0.12)' }}>
      <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-400/30" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-400/30" />
      <p className="tracking-widest uppercase mb-4" style={{ color: 'rgba(34,211,238,0.45)', fontSize: '9px', letterSpacing: '0.2em' }}>{title}</p>
      <div className="relative mb-3">
        <GaugeRing value={value} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold font-mono" style={{ color, textShadow: `0 0 12px ${color}` }}>
            {value !== null ? `${value.toFixed(1)}%` : 'N/A'}
          </span>
        </div>
      </div>
      {subtitle && <p className="text-xs font-mono" style={{ color: 'rgba(148,163,184,0.7)' }}>{subtitle}</p>}
      {extra && <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(148,163,184,0.35)' }}>{extra}</p>}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Disks', 'CPU Cores', 'Network'] as const;
type Tab = (typeof TABS)[number];

const TAB_COLORS: Record<Tab, string> = {
  Overview: '#22d3ee',
  Disks: '#4ade80',
  'CPU Cores': '#c084fc',
  Network: '#fb923c',
};

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ metrics }: { metrics: ServerMetrics | null }) {
  if (!metrics) return <div className="py-12 text-center tracking-widest uppercase" style={{ color: 'rgba(34,211,238,0.3)', fontSize: '11px' }}>No Data</div>;
  const cpuPct = pct(metrics.cpu);
  const memPct = pct(metrics.memoryPct);
  const diskPct = pct(metrics.diskPct);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard title="CPU Usage" value={cpuPct}
          subtitle={cpuPct !== null ? `${(100 - cpuPct).toFixed(1)}% idle` : undefined} />
        <MetricCard title="Memory" value={memPct}
          subtitle={metrics.memoryUsed ? formatBytes(metrics.memoryUsed) + ' used' : undefined}
          extra={metrics.memoryTotal ? 'of ' + formatBytes(metrics.memoryTotal) : undefined} />
        <MetricCard title="Disk (/)" value={diskPct}
          subtitle={metrics.diskUsed ? formatBytes(metrics.diskUsed) + ' used' : undefined}
          extra={metrics.diskTotal ? 'of ' + formatBytes(metrics.diskTotal) : undefined} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="relative p-5 rounded-lg" style={{ background: 'rgba(34,211,238,0.03)', border: '1px solid rgba(34,211,238,0.12)' }}>
          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-400/30" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-400/30" />
          <h3 className="tracking-widest uppercase mb-4" style={{ color: 'rgba(34,211,238,0.45)', fontSize: '9px', letterSpacing: '0.2em' }}>Load Average</h3>
          <div className="space-y-3">
            {[{ label: '1 minute', val: metrics.load1 },
              { label: '5 minutes', val: metrics.load5 },
              { label: '15 minutes', val: metrics.load15 }].map(({ label, val }) => {
              const n = val ? parseFloat(val) : null;
              const w = n !== null ? Math.min((n / 4) * 100, 100) : 0;
              const c = n !== null && n > 2 ? '#facc15' : '#22d3ee';
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: '11px' }}>{label}</span>
                    <span className="font-mono" style={{ color: c, textShadow: `0 0 6px ${c}` }}>
                      {n !== null ? n.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full rounded-full h-1" style={{ background: 'rgba(34,211,238,0.08)' }}>
                    <div className="h-1 rounded-full transition-all duration-700"
                      style={{ width: `${w}%`, background: c, boxShadow: `0 0 6px ${c}` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative p-5 rounded-lg" style={{ background: 'rgba(34,211,238,0.03)', border: '1px solid rgba(34,211,238,0.12)' }}>
          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-400/30" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-400/30" />
          <h3 className="tracking-widest uppercase mb-4" style={{ color: 'rgba(34,211,238,0.45)', fontSize: '9px', letterSpacing: '0.2em' }}>Network I/O</h3>
          <div className="space-y-2">
            {[{ label: 'Receive (RX)', val: metrics.netRx, color: '#4ade80' },
              { label: 'Transmit (TX)', val: metrics.netTx, color: '#22d3ee' }].map(({ label, val, color }) => (
              <div key={label} className="flex justify-between items-center py-2.5"
                style={{ borderBottom: '1px solid rgba(34,211,238,0.07)' }}>
                <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: '12px' }}>{label}</span>
                <span className="font-mono text-sm" style={{ color, textShadow: `0 0 8px ${color}` }}>
                  {val ? formatBytes(val) + '/s' : 'N/A'}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center py-2.5">
              <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: '12px' }}>Uptime</span>
              <span className="font-mono text-sm" style={{ color: '#c084fc', textShadow: '0 0 8px rgba(192,132,252,0.6)' }}>
                {formatUptime(metrics.uptime)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Disks tab ─────────────────────────────────────────────────────────────────

function DisksTab({ detail }: { detail: ServerDetail | null }) {
  if (!detail) return <div className="py-12 text-center tracking-widest uppercase" style={{ color: 'rgba(34,211,238,0.3)', fontSize: '11px' }}>Loading…</div>;
  if (detail.disks.length === 0)
    return <div className="py-12 text-center tracking-widest uppercase" style={{ color: 'rgba(34,211,238,0.3)', fontSize: '11px' }}>No Disk Data</div>;

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ border: '1px solid rgba(34,211,238,0.12)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(34,211,238,0.1)', background: 'rgba(34,211,238,0.04)' }}>
            {['Mountpoint', 'Device', 'Type', 'Size', 'Used', 'Free', 'Use %'].map((h) => (
              <th key={h} className="text-left px-5 py-3 tracking-widest uppercase"
                style={{ color: 'rgba(34,211,238,0.45)', fontSize: '9px', letterSpacing: '0.15em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {detail.disks.map((d, i) => (
            <tr key={d.mountpoint}
              style={{ borderBottom: '1px solid rgba(34,211,238,0.06)', background: i % 2 === 0 ? 'rgba(34,211,238,0.02)' : 'transparent' }}>
              <td className="px-5 py-3 font-mono text-xs" style={{ color: '#22d3ee' }}>{d.mountpoint}</td>
              <td className="px-5 py-3 font-mono text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{d.device}</td>
              <td className="px-5 py-3">
                <span className="text-xs px-2 py-0.5 rounded tracking-widest"
                  style={{ color: 'rgba(192,132,252,0.7)', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.2)' }}>
                  {d.fstype}
                </span>
              </td>
              <td className="px-5 py-3 font-mono text-xs" style={{ color: 'rgba(148,163,184,0.7)' }}>{formatBytes(d.sizeBytes)}</td>
              <td className="px-5 py-3 font-mono text-xs" style={{ color: 'rgba(148,163,184,0.7)' }}>{formatBytes(d.usedBytes)}</td>
              <td className="px-5 py-3 font-mono text-xs" style={{ color: 'rgba(74,222,128,0.7)' }}>{formatBytes(d.availBytes)}</td>
              <td className="px-5 py-3 w-40">
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-full h-1.5" style={{ background: 'rgba(34,211,238,0.08)' }}>
                    <div className="h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(d.usePct, 100)}%`, background: barColor(d.usePct), boxShadow: `0 0 4px ${barColor(d.usePct)}` }} />
                  </div>
                  <span className="font-mono text-xs w-10 text-right" style={{ color: barColor(d.usePct) }}>
                    {d.usePct.toFixed(1)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── CPU Cores tab ─────────────────────────────────────────────────────────────

function CpuCoresTab({ detail }: { detail: ServerDetail | null }) {
  if (!detail) return <div className="py-12 text-center tracking-widest uppercase" style={{ color: 'rgba(34,211,238,0.3)', fontSize: '11px' }}>Loading…</div>;
  if (detail.cpuCores.length === 0)
    return <div className="py-12 text-center tracking-widest uppercase" style={{ color: 'rgba(34,211,238,0.3)', fontSize: '11px' }}>No CPU Data</div>;

  const cols = detail.cpuCores.length > 8 ? 2 : 1;

  return (
    <div className={`grid gap-3 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {detail.cpuCores.map((c) => {
        const color = barColor(c.usagePct);
        return (
          <div key={c.core} className="relative px-5 py-4 rounded-lg"
            style={{ background: 'rgba(34,211,238,0.02)', border: '1px solid rgba(34,211,238,0.1)' }}>
            <div className="flex items-center gap-4">
              <span className="font-mono tracking-widest uppercase text-xs w-14 shrink-0"
                style={{ color: 'rgba(34,211,238,0.45)', fontSize: '9px' }}>CPU {c.core}</span>
              <div className="flex-1 rounded-full h-1.5" style={{ background: 'rgba(34,211,238,0.08)' }}>
                <div className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${c.usagePct}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
              </div>
              <span className="font-mono text-xs w-14 text-right" style={{ color, textShadow: `0 0 6px ${color}` }}>
                {c.usagePct.toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Network tab ───────────────────────────────────────────────────────────────

function NetworkTab({ detail }: { detail: ServerDetail | null }) {
  if (!detail) return <div className="py-12 text-center tracking-widest uppercase" style={{ color: 'rgba(34,211,238,0.3)', fontSize: '11px' }}>Loading…</div>;
  if (detail.networkInterfaces.length === 0)
    return <div className="py-12 text-center tracking-widest uppercase" style={{ color: 'rgba(34,211,238,0.3)', fontSize: '11px' }}>No Interface Data</div>;

  const maxRate = Math.max(...detail.networkInterfaces.flatMap((n) => [n.rxBytesPerSec, n.txBytesPerSec]), 1);

  return (
    <div className="space-y-3">
      {detail.networkInterfaces.map((iface) => (
        <div key={iface.device} className="relative p-5 rounded-lg"
          style={{ background: 'rgba(34,211,238,0.03)', border: '1px solid rgba(34,211,238,0.12)' }}>
          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-400/30" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-400/30" />
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono font-bold text-sm" style={{ color: '#22d3ee', textShadow: '0 0 8px rgba(34,211,238,0.5)' }}>{iface.device}</span>
            <div className="flex gap-4 text-xs font-mono">
              <span style={{ color: 'rgba(148,163,184,0.5)' }}>RX <span style={{ color: '#4ade80', textShadow: '0 0 6px rgba(74,222,128,0.6)' }}>{formatBytes(iface.rxBytesPerSec)}/s</span></span>
              <span style={{ color: 'rgba(148,163,184,0.5)' }}>TX <span style={{ color: '#22d3ee', textShadow: '0 0 6px rgba(34,211,238,0.6)' }}>{formatBytes(iface.txBytesPerSec)}/s</span></span>
            </div>
          </div>
          <div className="space-y-2">
            {[{ label: 'Receive', val: iface.rxBytesPerSec, color: '#4ade80' },
              { label: 'Transmit', val: iface.txBytesPerSec, color: '#22d3ee' }].map(({ label, val, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'rgba(148,163,184,0.4)', fontSize: '10px' }}>{label}</span>
                  <span className="font-mono" style={{ color, fontSize: '10px' }}>{formatBytes(val)}/s</span>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(34,211,238,0.08)' }}>
                  <div className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${(val / maxRate) * 100}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ServerDetailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const instance = params.get('instance') || '';
  const network = params.get('network') || '';
  const networkLabel = params.get('networkLabel') || network;

  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [detail, setDetail] = useState<ServerDetail | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    const base = `/api/server-metrics?instance=${encodeURIComponent(instance)}&network=${encodeURIComponent(network)}`;
    const detailBase = `/api/server-detail?instance=${encodeURIComponent(instance)}&network=${encodeURIComponent(network)}`;
    const [mRes, dRes] = await Promise.all([fetch(base), fetch(detailBase)]);
    if (mRes.ok) setMetrics(await mRes.json());
    if (dRes.ok) setDetail(await dRes.json());
    setLoadingMetrics(false);
    setLoadingDetail(false);
    setRefreshing(false);
    setLastUpdated(new Date());
  }, [instance, network]);

  useEffect(() => {
    if (instance && network) {
      fetchAll();
      const t = setInterval(() => fetchAll(), 30000);
      return () => clearInterval(t);
    }
  }, [fetchAll, instance, network]);

  return (
    <div className="relative p-6">
      {/* Back */}
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm mb-5 transition-all tracking-widest uppercase"
        style={{ color: 'rgba(34,211,238,0.5)', fontSize: '11px' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#22d3ee'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(34,211,238,0.5)'}>
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)', boxShadow: '0 0 16px rgba(34,211,238,0.1)' }}>
            <Server className="w-5 h-5" style={{ color: '#22d3ee' }} />
          </div>
          <div>
            <h1 className="font-bold font-mono text-lg" style={{ color: '#67e8f9', textShadow: '0 0 16px rgba(34,211,238,0.5)' }}>{instance}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="tracking-widest uppercase px-2 py-0.5 rounded text-xs"
                style={{ color: '#c084fc', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.25)', fontSize: '9px' }}>
                {networkLabel}
              </span>
              {metrics?.uptime && (
                <span className="tracking-widest uppercase" style={{ color: 'rgba(34,211,238,0.4)', fontSize: '9px' }}>
                  Uptime: {formatUptime(metrics.uptime)}
                </span>
              )}
              {lastUpdated && (
                <span className="font-mono" style={{ color: 'rgba(34,211,238,0.25)', fontSize: '9px' }}>
                  · {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => fetchAll(true)} disabled={refreshing}
          className="flex items-center gap-2 text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
          style={{ color: 'rgba(34,211,238,0.6)', border: '1px solid rgba(34,211,238,0.2)', background: 'rgba(34,211,238,0.04)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(34,211,238,0.5)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(34,211,238,0.2)'}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5" style={{ borderBottom: '1px solid rgba(34,211,238,0.1)' }}>
        {TABS.map((tab) => {
          const active = activeTab === tab;
          const color = TAB_COLORS[tab];
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 text-xs font-medium transition-all tracking-widest uppercase -mb-px"
              style={{
                color: active ? color : 'rgba(148,163,184,0.4)',
                borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
                textShadow: active ? `0 0 8px ${color}` : 'none',
                fontSize: '10px',
              }}>
              {tab}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loadingMetrics && loadingDetail ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg h-52 animate-pulse"
              style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.08)' }} />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'Overview' && <OverviewTab metrics={metrics} />}
          {activeTab === 'Disks' && <DisksTab detail={detail} />}
          {activeTab === 'CPU Cores' && <CpuCoresTab detail={detail} />}
          {activeTab === 'Network' && <NetworkTab detail={detail} />}
        </>
      )}
    </div>
  );
}

export default function ServerDetailPage() {
  return (
    <Suspense fallback={
      <div className="p-6 tracking-widest uppercase" style={{ color: 'rgba(34,211,238,0.3)', fontSize: '11px' }}>Loading…</div>
    }>
      <ServerDetailContent />
    </Suspense>
  );
}
