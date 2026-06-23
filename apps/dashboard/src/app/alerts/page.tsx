'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle, Info } from 'lucide-react';

interface AlertItem {
  instance: string;
  job: string;
  network: string;
  health: string;
  lastScrape: string | null;
  lastError: string | null;
  recommendation: string;
  severity: 'critical' | 'warning';
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAlerts = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
      }
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => fetchAlerts(), 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const critical = alerts.filter(a => a.severity === 'critical');
  const warnings = alerts.filter(a => a.severity === 'warning');

  return (
    <div className="relative p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-lg tracking-widest uppercase"
            style={{ color: '#f87171', textShadow: '0 0 20px rgba(248,113,113,0.5)' }}>
            Active Alerts
          </h1>
          <p className="text-xs tracking-widest uppercase mt-0.5" style={{ color: 'rgba(248,113,113,0.4)', fontSize: '10px' }}>
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
          </p>
        </div>
        <button
          onClick={() => fetchAlerts(true)}
          disabled={refreshing}
          className="flex items-center gap-2 text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
          style={{ color: 'rgba(248,113,113,0.6)', border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.04)' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Alerts',   value: alerts.length,   accent: '#f87171', glow: 'rgba(248,113,113,0.4)' },
          { label: 'Critical',       value: critical.length, accent: '#f87171', glow: 'rgba(248,113,113,0.4)' },
          { label: 'Warnings',       value: warnings.length, accent: '#fb923c', glow: 'rgba(251,146,60,0.4)'  },
        ].map(stat => (
          <div key={stat.label} className="relative rounded-xl p-4 overflow-hidden"
            style={{ background: '#020c18', border: `1px solid ${stat.accent}28`, boxShadow: `0 0 20px ${stat.glow}08` }}>
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l rounded-tl-xl" style={{ borderColor: `${stat.accent}50` }} />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r rounded-br-xl" style={{ borderColor: `${stat.accent}50` }} />
            <p className="tracking-widest uppercase mb-1" style={{ color: `${stat.accent}80`, fontSize: '9px' }}>{stat.label}</p>
            <p className="text-3xl font-bold font-mono" style={{ color: stat.value > 0 ? stat.accent : 'rgba(100,116,139,0.4)', textShadow: stat.value > 0 ? `0 0 16px ${stat.glow}` : undefined }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* All clear state */}
      {!loading && alerts.length === 0 && (
        <div className="rounded-xl p-12 flex flex-col items-center justify-center gap-4"
          style={{ background: '#020c18', border: '1px solid rgba(74,222,128,0.2)' }}>
          <CheckCircle className="w-12 h-12" style={{ color: '#4ade80', filter: 'drop-shadow(0 0 12px rgba(74,222,128,0.6))' }} />
          <p className="font-bold tracking-widest uppercase" style={{ color: '#4ade80', fontSize: '13px' }}>All Systems Operational</p>
          <p className="tracking-widest uppercase text-center" style={{ color: 'rgba(74,222,128,0.4)', fontSize: '10px' }}>
            No active alerts — all targets are healthy
          </p>
        </div>
      )}

      {/* Critical alerts */}
      {critical.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-sm" style={{ background: '#f87171', boxShadow: '0 0 6px rgba(248,113,113,0.8)' }} />
            <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#f87171' }}>Critical — Down</h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontSize: '10px' }}>
              {critical.length}
            </span>
          </div>
          <div className="space-y-3">
            {critical.map((a, i) => (
              <AlertCard key={i} alert={a} />
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-sm" style={{ background: '#fb923c', boxShadow: '0 0 6px rgba(251,146,60,0.8)' }} />
            <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#fb923c' }}>Warnings</h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.2)', fontSize: '10px' }}>
              {warnings.length}
            </span>
          </div>
          <div className="space-y-3">
            {warnings.map((a, i) => (
              <AlertCard key={i} alert={a} />
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl h-28 animate-pulse" style={{ background: '#020c18', border: '1px solid rgba(248,113,113,0.1)' }} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert }: { alert: AlertItem }) {
  const isCritical = alert.severity === 'critical';
  const accent = isCritical ? '#f87171' : '#fb923c';
  const glow   = isCritical ? 'rgba(248,113,113,0.3)' : 'rgba(251,146,60,0.3)';

  return (
    <div className="rounded-xl p-4" style={{ background: '#020c18', border: `1px solid ${accent}22` }}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: accent, boxShadow: `0 0 6px ${glow}` }} />
          <span className="font-mono font-bold" style={{ color: accent, fontSize: '13px' }}>{alert.instance}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded font-bold tracking-widest uppercase"
            style={{ fontSize: '8px', background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
            {isCritical ? 'DOWN' : 'WARNING'}
          </span>
          <span className="px-2 py-0.5 rounded tracking-widest uppercase"
            style={{ fontSize: '8px', background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.15)' }}>
            {alert.network}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
        <div>
          <p className="tracking-widest uppercase mb-0.5" style={{ color: 'rgba(148,163,184,0.35)', fontSize: '8px' }}>Job</p>
          <p style={{ color: 'rgba(148,163,184,0.6)' }}>{alert.job || '—'}</p>
        </div>
        <div>
          <p className="tracking-widest uppercase mb-0.5" style={{ color: 'rgba(148,163,184,0.35)', fontSize: '8px' }}>Last Scrape</p>
          <p style={{ color: 'rgba(148,163,184,0.6)' }}>
            {alert.lastScrape ? new Date(alert.lastScrape).toLocaleTimeString() : '—'}
          </p>
        </div>
      </div>

      {alert.lastError && (
        <div className="mb-3 px-3 py-2 rounded-md" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.12)' }}>
          <p className="tracking-widest uppercase mb-1" style={{ color: 'rgba(248,113,113,0.5)', fontSize: '8px' }}>Error</p>
          <p className="font-mono text-xs break-all" style={{ color: 'rgba(248,113,113,0.7)' }}>{alert.lastError}</p>
        </div>
      )}

      <div className="flex items-start gap-2 px-3 py-2 rounded-md" style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.1)' }}>
        <Info className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#22d3ee' }} />
        <p className="text-xs" style={{ color: 'rgba(34,211,238,0.6)' }}>{alert.recommendation}</p>
      </div>
    </div>
  );
}
