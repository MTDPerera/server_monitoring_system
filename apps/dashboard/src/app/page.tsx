'use client';

import Link from 'next/link';
import { Activity, Shield, Globe, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: '#010912' }}>

      {/* Static CSS background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 60% 40%, rgba(6,182,212,0.07) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(14,116,144,0.06) 0%, transparent 50%)',
      }} />
      {/* Grid overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* Corner bracket decorations */}
      <span className="fixed top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-cyan-400/50" />
      <span className="fixed top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-cyan-400/50" />
      <span className="fixed bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-cyan-400/50" />
      <span className="fixed bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-cyan-400/50" />

      {/* Top status bar */}
      <div className="fixed top-6 left-0 right-0 flex justify-center pointer-events-none">
        <div className="flex items-center gap-6 px-6 py-1.5 rounded-full"
          style={{ border: '1px solid rgba(34,211,238,0.15)', background: 'rgba(1,9,18,0.6)' }}>
          {[
            { dot: '#4ade80', label: 'SYSTEM ONLINE' },
            { dot: '#22d3ee', label: '3 NETWORKS ACTIVE' },
            { dot: '#c084fc', label: 'MONITORING LIVE' },
          ].map(item => (
            <span key={item.label} className="flex items-center gap-1.5 text-xs tracking-widest"
              style={{ color: 'rgba(148,163,184,0.7)', fontSize: '9px' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: item.dot, boxShadow: `0 0 6px ${item.dot}` }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8">

        {/* Icon */}
        <div className="mb-8 rounded-2xl flex items-center justify-center relative"
          style={{
            width: '260px', height: '260px',
            background: 'rgba(34,211,238,0.07)',
            border: '1px solid rgba(34,211,238,0.3)',
            boxShadow: '0 0 40px rgba(34,211,238,0.15), inset 0 0 20px rgba(34,211,238,0.05)',
          }}>
          <Activity style={{ width: '240px', height: '170px', color: '#22d3ee', filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.8))' }} />
          {/* TD logo overlay */}
          <img src="/td-logo.png" alt="TD" className="absolute"
            style={{ width: '65px', height: '65px', objectFit: 'contain' }} />
        </div>

        {/* Title */}
        <h1 className="font-black tracking-widest uppercase mb-2"
          style={{
            fontSize: 'clamp(2rem, 6vw, 4rem)',
            color: '#67e8f9',
            textShadow: '0 0 30px rgba(34,211,238,0.6), 0 0 60px rgba(34,211,238,0.3)',
            letterSpacing: '0.2em',
          }}>
          Server Monitor
        </h1>

        {/* Subtitle */}
        <p className="tracking-widest uppercase mb-2"
          style={{ color: 'rgba(6,182,212,0.6)', fontSize: '11px', letterSpacing: '0.4em' }}>
          Multi-Network Monitoring Dashboard
        </p>

        {/* Divider line */}
        <div className="flex items-center gap-3 my-8 w-96 max-w-full">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(34,211,238,0.4))' }} />
          <span style={{ color: 'rgba(34,211,238,0.4)', fontSize: '10px' }}>◆</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(34,211,238,0.4))' }} />
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { icon: Shield,  label: 'SSL Monitoring',      color: '#4ade80' },
            { icon: Globe,   label: 'World Server Map',    color: '#22d3ee' },
            { icon: Zap,     label: 'API Endpoints',       color: '#fb923c' },
            { icon: Activity, label: 'Real-time Metrics', color: '#c084fc' },
          ].map(({ icon: Icon, label, color }) => (
            <span key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs tracking-widest uppercase"
              style={{
                color,
                background: `${color}10`,
                border: `1px solid ${color}30`,
                fontSize: '9px',
              }}>
              <Icon className="w-3 h-3" />
              {label}
            </span>
          ))}
        </div>

        {/* Enter button */}
        <Link href="/overview"
          className="group relative flex items-center gap-3 px-10 py-4 rounded-lg font-bold tracking-widest uppercase transition-all"
          style={{
            color: '#010912',
            background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
            boxShadow: '0 0 30px rgba(34,211,238,0.4), 0 0 60px rgba(34,211,238,0.2)',
            fontSize: '12px',
            letterSpacing: '0.25em',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 50px rgba(34,211,238,0.7), 0 0 100px rgba(34,211,238,0.3)';
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(34,211,238,0.4), 0 0 60px rgba(34,211,238,0.2)';
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          <Activity className="w-4 h-4" />
          Enter Dashboard
        </Link>

      </div>

      {/* TD Productions logo — bottom right, low visibility */}
      <div className="fixed bottom-10 right-8 pointer-events-none" style={{ opacity: 0.15 }}>
        <img src="/td-logo.png" alt="TD Productions" style={{ width: '90px', height: 'auto' }} />
      </div>
    </div>
  );
}
