'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw } from 'lucide-react';
import { NetworkCard } from '@/components/NetworkCard';
import type { NetworkStats, TargetInfo } from '@/lib/prometheus';

const WorldMap = dynamic(
  () => import('@/components/WorldMap').then(m => m.WorldMap),
  { ssr: false, loading: () => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl h-[460px] flex items-center justify-center">
      <p className="text-gray-600 text-sm">Loading map…</p>
    </div>
  )}
);

function StatusDot({ health }: { health: string }) {
  const isUp = health === 'up';
  return (
    <span className="inline-flex items-center gap-1.5 font-bold tracking-widest uppercase"
      style={{ color: isUp ? '#4ade80' : '#f87171', textShadow: isUp ? '0 0 8px rgba(74,222,128,0.7)' : '0 0 8px rgba(248,113,113,0.7)', fontSize: '9px' }}>
      <span className="w-1.5 h-1.5 rounded-full"
        style={{ background: isUp ? '#4ade80' : '#f87171', boxShadow: isUp ? '0 0 6px rgba(74,222,128,0.9)' : '0 0 6px rgba(248,113,113,0.9)' }} />
      {isUp ? 'Up' : 'Down'}
    </span>
  );
}

export default function OverviewPage() {
  const [networks, setNetworks] = useState<NetworkStats[]>([]);
  const [targets, setTargets] = useState<TargetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const [ovRes, tgRes] = await Promise.all([
        fetch('/api/overview'),
        fetch('/api/targets'),
      ]);
      if (ovRes.ok) setNetworks((await ovRes.json()).networks);
      if (tgRes.ok) setTargets((await tgRes.json()).targets);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalUp = networks.reduce((s, n) => s + n.up, 0);
  const totalDown = networks.reduce((s, n) => s + n.down, 0);
  const totalServers = networks.reduce((s, n) => s + n.total, 0);

  return (
    <div className="relative p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-lg tracking-widest uppercase"
            style={{ color: '#67e8f9', textShadow: '0 0 20px rgba(34,211,238,0.5)' }}>
            Overview
          </h1>
          <p className="text-xs tracking-widest uppercase mt-0.5" style={{ color: 'rgba(6,182,212,0.5)', fontSize: '10px' }}>
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
          style={{ color: 'rgba(34,211,238,0.6)', border: '1px solid rgba(34,211,238,0.2)', background: 'rgba(34,211,238,0.04)' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Servers', value: totalServers, accent: '#22d3ee', glow: 'rgba(34,211,238,0.4)',  numColor: '#e2e8f0',   numGlow: undefined },
          { label: 'Online',        value: totalUp,      accent: '#4ade80', glow: 'rgba(74,222,128,0.4)',  numColor: '#4ade80',   numGlow: '0 0 16px rgba(74,222,128,0.6)' },
          { label: 'Offline',       value: totalDown,    accent: '#f87171', glow: 'rgba(248,113,113,0.4)', numColor: totalDown > 0 ? '#f87171' : 'rgba(100,116,139,0.35)', numGlow: totalDown > 0 ? '0 0 16px rgba(248,113,113,0.6)' : undefined },
        ].map((stat) => (
          <div key={stat.label} className="relative rounded-xl p-4 overflow-hidden"
            style={{ background: '#020c18', border: `1px solid ${stat.accent}28`, boxShadow: `0 0 20px ${stat.glow}08` }}>
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l rounded-tl-xl" style={{ borderColor: `${stat.accent}50` }} />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r rounded-br-xl" style={{ borderColor: `${stat.accent}50` }} />
            <p className="tracking-widest uppercase mb-1" style={{ color: `${stat.accent}80`, fontSize: '9px' }}>{stat.label}</p>
            <p className="text-3xl font-bold font-mono" style={{ color: stat.numColor, textShadow: stat.numGlow }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Network cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {loading
          ? [1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl p-5 animate-pulse h-40"
                style={{ background: '#020c18', border: '1px solid rgba(6,182,212,0.12)' }} />
            ))
          : networks.map((n) => <NetworkCard key={n.network} {...n} />)}
      </div>

      {/* World map */}
      <div className="mb-6">
        <WorldMap networkStats={networks.map(n => ({ network: n.label, up: n.up, total: n.total }))} />
      </div>

      {/* Targets table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#020c18', border: '1px solid rgba(6,182,212,0.18)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(6,182,212,0.12)', background: 'rgba(6,182,212,0.03)' }}>
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-sm bg-cyan-400" style={{ boxShadow: '0 0 6px rgba(34,211,238,0.8)' }} />
            <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#67e8f9' }}>All Targets</h2>
          </div>
          <span className="text-xs tracking-widest uppercase font-mono" style={{ color: 'rgba(6,182,212,0.4)', fontSize: '10px' }}>{targets.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(6,182,212,0.1)' }}>
                {['Instance', 'Network', 'Job', 'Status', 'Last Scrape'].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 font-bold tracking-widest uppercase"
                    style={{ color: 'rgba(6,182,212,0.45)', fontSize: '9px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-xs tracking-widest uppercase"
                    style={{ color: 'rgba(6,182,212,0.3)' }}>Loading…</td>
                </tr>
              ) : targets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-xs tracking-widest uppercase"
                    style={{ color: 'rgba(6,182,212,0.3)' }}>
                    No targets found — are the Prometheus instances running?
                  </td>
                </tr>
              ) : (
                targets.map((t, i) => (
                  <tr key={i} className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(6,182,212,0.06)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,211,238,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: '#94a3b8' }}>{t.instance}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded font-bold tracking-widest uppercase"
                        style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)', fontSize: '9px' }}>
                        {t.networkLabel}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs tracking-wide" style={{ color: 'rgba(148,163,184,0.6)' }}>{t.job}</td>
                    <td className="px-5 py-3"><StatusDot health={t.health} /></td>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: 'rgba(6,182,212,0.4)' }}>
                      {t.lastScrape ? new Date(t.lastScrape).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
