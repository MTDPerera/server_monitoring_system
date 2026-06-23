'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Search, ChevronRight } from 'lucide-react';
import type { TargetInfo } from '@/lib/prometheus';
import { CyberBackground } from '@/components/CyberBackground';

export default function ServersPage() {
  const router = useRouter();
  const [targets, setTargets] = useState<TargetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkFilter, setNetworkFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchTargets = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    setLoading(true);
    try {
      const res = await fetch('/api/targets');
      if (res.ok) setTargets((await res.json()).targets);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTargets();
    const interval = setInterval(() => fetchTargets(), 30000);
    return () => clearInterval(interval);
  }, [fetchTargets]);

  const networks = [...new Set(targets.map((t) => t.network))];

  const filtered = targets.filter((t) => {
    if (networkFilter !== 'all' && t.network !== networkFilter) return false;
    if (search && !t.instance.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const up = filtered.filter((t) => t.health === 'up').length;
  const down = filtered.filter((t) => t.health !== 'up').length;

  return (
    <div className="relative p-6">
      <CyberBackground className="fixed inset-0 -z-10" videoId="Im7slkFMtI8" opacity={0.10} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-lg tracking-widest uppercase"
            style={{ color: '#67e8f9', textShadow: '0 0 20px rgba(34,211,238,0.5)' }}>
            Servers
          </h1>
          <p className="text-xs tracking-widest uppercase mt-0.5" style={{ color: 'rgba(6,182,212,0.5)', fontSize: '10px' }}>
            {up} up · {down} down
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(34,211,238,0.4)' }} />
            <input
              type="text"
              placeholder="Search instance…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'rgba(1,9,18,0.8)', border: '1px solid rgba(34,211,238,0.2)', color: '#94a3b8' }}
              className="text-xs rounded-lg pl-8 pr-3 py-1.5 outline-none w-44 placeholder-slate-600"
            />
          </div>
          <select
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value)}
            style={{ background: 'rgba(1,9,18,0.8)', border: '1px solid rgba(34,211,238,0.2)', color: '#94a3b8' }}
            className="text-xs rounded-lg px-3 py-1.5 outline-none"
          >
            <option value="all">All Networks</option>
            {networks.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button
            onClick={() => fetchTargets(true)}
            disabled={refreshing}
            style={{ color: 'rgba(34,211,238,0.6)', border: '1px solid rgba(34,211,238,0.2)', background: 'rgba(34,211,238,0.04)' }}
            className="flex items-center gap-2 text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#020c18', border: '1px solid rgba(6,182,212,0.18)' }}>
        {/* Card header */}
        <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgba(6,182,212,0.12)', background: 'rgba(6,182,212,0.03)' }}>
          <span className="w-1 h-4 rounded-sm bg-cyan-400" style={{ boxShadow: '0 0 6px rgba(34,211,238,0.8)' }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#67e8f9' }}>Target Nodes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(6,182,212,0.1)' }}>
                {['Instance', 'Network', 'Job', 'Status', 'Last Scrape', 'Error'].map((h) => (
                  <th
                    key={h}
                    style={{ color: 'rgba(6,182,212,0.45)', fontSize: '9px', borderBottom: '1px solid rgba(6,182,212,0.1)' }}
                    className="text-left px-5 py-2.5 font-bold tracking-widest uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.3)', fontSize: '9px' }}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.3)', fontSize: '9px' }}>
                    No servers found
                  </td>
                </tr>
              ) : (
                filtered.map((t, i) => (
                  <tr
                    key={i}
                    onClick={() =>
                      t.health === 'up' &&
                      router.push(
                        `/servers/detail?instance=${encodeURIComponent(t.instance)}&network=${t.network}&networkLabel=${encodeURIComponent(t.networkLabel)}`
                      )
                    }
                    style={{ borderBottom: '1px solid rgba(6,182,212,0.06)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,211,238,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    className={`transition-colors group ${t.health === 'up' ? 'cursor-pointer' : 'opacity-60'}`}
                  >
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: '#94a3b8' }}>
                      <div className="flex items-center gap-2">
                        {t.instance}
                        {t.health === 'up' && (
                          <ChevronRight className="w-3.5 h-3.5 transition-colors" style={{ color: 'rgba(34,211,238,0.3)' }} />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded font-bold tracking-widest uppercase"
                        style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)', fontSize: '9px' }}>
                        {t.networkLabel}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{t.job}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 font-medium"
                        style={t.health === 'up'
                          ? { color: '#4ade80', textShadow: '0 0 8px rgba(74,222,128,0.7)', fontSize: '9px' }
                          : { color: '#f87171', textShadow: '0 0 8px rgba(248,113,113,0.7)', fontSize: '9px' }}>
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={t.health === 'up'
                            ? { background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.9)' }
                            : { background: '#f87171', boxShadow: '0 0 6px rgba(248,113,113,0.9)' }}
                        />
                        {t.health === 'up' ? 'Up' : 'Down'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
                      {t.lastScrape
                        ? new Date(t.lastScrape).toLocaleTimeString()
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs max-w-xs truncate" style={{ color: 'rgba(248,113,113,0.6)' }}>
                      {t.lastError || '—'}
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
