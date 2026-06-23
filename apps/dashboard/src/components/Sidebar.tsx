'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Server, Globe, Plug, Activity, AlertTriangle } from 'lucide-react';

const navItems = [
  { href: '/overview',  label: 'Overview',  icon: LayoutDashboard, color: '#22d3ee', glow: 'rgba(34,211,238,0.6)'  },
  { href: '/servers',   label: 'Servers',   icon: Server,          color: '#4ade80', glow: 'rgba(74,222,128,0.6)'  },
  { href: '/websites',  label: 'Websites',  icon: Globe,           color: '#c084fc', glow: 'rgba(192,132,252,0.6)' },
  { href: '/endpoints', label: 'Endpoints', icon: Plug,            color: '#fb923c', glow: 'rgba(251,146,60,0.6)'  },
];

interface Alert { label: string; type: 'server' | 'website'; }

function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  useEffect(() => {
    async function fetch_alerts() {
      try {
        const [targetsRes, websitesRes] = await Promise.allSettled([
          fetch('/api/targets').then(r => r.json()),
          fetch('/api/websites').then(r => r.json()),
        ]);
        const result: Alert[] = [];
        if (targetsRes.status === 'fulfilled') {
          (targetsRes.value.targets ?? [])
            .filter((t: any) => t.health !== 'up')
            .slice(0, 3)
            .forEach((t: any) => result.push({ label: t.instance, type: 'server' }));
        }
        if (websitesRes.status === 'fulfilled') {
          (Array.isArray(websitesRes.value) ? websitesRes.value : [])
            .filter((w: any) => w.checks?.[0]?.status === 'down' || w.checks?.[0]?.status === 'error')
            .slice(0, 2)
            .forEach((w: any) => result.push({ label: w.name, type: 'website' }));
        }
        setAlerts(result.slice(0, 4));
      } catch {}
    }
    fetch_alerts();
    const id = setInterval(fetch_alerts, 30000);
    return () => clearInterval(id);
  }, []);
  return alerts;
}

function useClock() {
  const [time, setTime] = useState({ h: '', m: '', s: '', date: '' });
  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime({
        h: String(now.getHours()).padStart(2, '0'),
        m: String(now.getMinutes()).padStart(2, '0'),
        s: String(now.getSeconds()).padStart(2, '0'),
        date: now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function Sidebar() {
  const pathname = usePathname();
  const clock = useClock();
  const alerts = useAlerts();

  return (
    <aside className="w-72 flex flex-col h-full shrink-0 relative"
      style={{ background: '#010912', borderRight: '1px solid rgba(6,182,212,0.15)', boxShadow: '2px 0 20px rgba(6,182,212,0.04)' }}>
      <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-400/40" />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-400/40" />

      {/* Logo */}
      <div className="px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(6,182,212,0.12)' }}>
        <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', boxShadow: '0 0 12px rgba(34,211,238,0.2)' }}>
          <Activity className="w-4 h-4" style={{ color: '#22d3ee' }} />
        </div>
        <div>
          <h1 className="font-bold text-xs tracking-widest uppercase leading-tight"
            style={{ color: '#67e8f9', textShadow: '0 0 10px rgba(34,211,238,0.5)' }}>
            Server Monitor
          </h1>
          <p className="tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.4)', fontSize: '9px' }}>
            Multi-Network
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-xs tracking-widest uppercase transition-all"
              style={active ? {
                color: item.color,
                background: `${item.color}11`,
                textShadow: `0 0 10px ${item.glow}`,
                borderLeft: `2px solid ${item.color}bb`,
                boxShadow: `inset 0 0 12px ${item.color}08`,
              } : { color: 'rgba(148,163,184,0.5)' }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = item.color;
                  (e.currentTarget as HTMLElement).style.background = `${item.color}09`;
                  (e.currentTarget as HTMLElement).style.textShadow = `0 0 8px ${item.glow}`;
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.5)';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.textShadow = 'none';
                }
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Active Alerts */}
      <div className="mx-3 mb-3 px-4 py-3 rounded-md" style={{ border: `1px solid ${alerts.length > 0 ? 'rgba(248,113,113,0.25)' : 'rgba(74,222,128,0.15)'}`, background: alerts.length > 0 ? 'rgba(248,113,113,0.04)' : 'rgba(74,222,128,0.03)', transition: 'all 0.5s ease' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="tracking-widest uppercase flex items-center gap-1.5" style={{ color: alerts.length > 0 ? 'rgba(248,113,113,0.7)' : 'rgba(74,222,128,0.5)', fontSize: '8px', letterSpacing: '0.2em' }}>
            <AlertTriangle className="w-2.5 h-2.5" />
            Active Alerts
          </p>
          <span className="rounded-full px-1.5 py-0.5 font-mono" style={{ fontSize: '8px', background: alerts.length > 0 ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.1)', color: alerts.length > 0 ? '#f87171' : '#4ade80' }}>
            {alerts.length}
          </span>
        </div>
        {alerts.length === 0 ? (
          <p className="tracking-wide" style={{ color: 'rgba(74,222,128,0.5)', fontSize: '9px' }}>● All systems operational</p>
        ) : (
          <div className="space-y-1.5">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: '#f87171', boxShadow: '0 0 4px #f87171' }} />
                <span className="font-mono truncate" style={{ color: 'rgba(248,113,113,0.8)', fontSize: '9px' }}>{a.label}</span>
                <span className="shrink-0 tracking-widest uppercase" style={{ color: 'rgba(248,113,113,0.4)', fontSize: '7px' }}>DOWN</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Clock */}
      <div className="mx-3 mb-3 px-4 py-3 rounded-md" style={{ border: '1px solid rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.03)' }}>
        <p className="tracking-widest uppercase mb-2" style={{ color: 'rgba(34,211,238,0.4)', fontSize: '8px', letterSpacing: '0.2em' }}>System Time</p>
        <div className="flex items-end gap-1 mb-1">
          <span className="font-mono font-bold tabular-nums"
            style={{ fontSize: '28px', color: '#22d3ee', textShadow: '0 0 16px rgba(34,211,238,0.7)', lineHeight: 1 }}>
            {clock.h}<span style={{ opacity: 0.5 }}>:</span>{clock.m}
          </span>
          <span className="font-mono font-bold tabular-nums mb-0.5"
            style={{ fontSize: '14px', color: 'rgba(34,211,238,0.5)', textShadow: '0 0 8px rgba(34,211,238,0.4)', lineHeight: 1 }}>
            :{clock.s}
          </span>
        </div>
        <p className="font-mono tracking-widest" style={{ color: 'rgba(34,211,238,0.3)', fontSize: '8px' }}>{clock.date}</p>
      </div>

      {/* Network status */}
      <div className="px-4 py-4 mx-3 mb-3 rounded-md" style={{ border: '1px solid rgba(34,211,238,0.1)', background: 'rgba(34,211,238,0.03)' }}>
        <p className="tracking-widest uppercase mb-3" style={{ color: 'rgba(34,211,238,0.4)', fontSize: '8px', letterSpacing: '0.2em' }}>Networks</p>
        {[
          { label: 'Physical Servers', color: '#22d3ee' },
          { label: 'Hetzner Bare-Metal', color: '#c084fc' },
          { label: 'Third Network', color: '#4ade80' },
        ].map(n => (
          <div key={n.label} className="flex items-center justify-between mb-2">
            <span className="tracking-wide truncate" style={{ color: 'rgba(148,163,184,0.5)', fontSize: '9px' }}>{n.label}</span>
            <span className="flex items-center gap-1" style={{ color: n.color, fontSize: '8px' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: n.color, boxShadow: `0 0 4px ${n.color}` }} />
              ON
            </span>
          </div>
        ))}
      </div>

      {/* Decorative scan line */}
      <div className="mx-3 mb-3 rounded-md overflow-hidden relative" style={{ height: '60px', border: '1px solid rgba(34,211,238,0.08)', background: 'rgba(1,9,18,0.6)' }}>
        <div className="absolute inset-0 flex flex-col justify-around px-3 py-2">
          {[0.6, 0.35, 0.5, 0.25].map((w, i) => (
            <div key={i} className="h-px rounded-full" style={{ width: `${w * 100}%`, background: `rgba(34,211,238,${0.08 + i * 0.04})` }} />
          ))}
        </div>
        <div className="absolute top-1 right-2 tracking-widest uppercase" style={{ color: 'rgba(34,211,238,0.25)', fontSize: '7px' }}>SYS OK</div>
      </div>

      <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(6,182,212,0.1)' }}>
        <p className="tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.3)', fontSize: '9px' }}>v0.1.0 · dev</p>
      </div>
    </aside>
  );
}
