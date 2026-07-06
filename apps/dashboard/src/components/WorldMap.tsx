'use client';

import { useState, useRef, useCallback } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

const GEO_URL = '/countries-110m.json';

interface ServerLocation {
  name: string;
  country: string;
  flag: string;
  coordinates: [number, number];
  rotate: [number, number, number];
  network: string;
  online: boolean;
  serverCount: number;
}

const LOCATIONS: ServerLocation[] = [
  {
    name: 'Singapore',
    country: 'Singapore',
    flag: '🇸🇬',
    coordinates: [103.8, 1.35],
    rotate: [-103.8, -1.35, 0],
    network: 'Network 1',
    online: true,
    serverCount: 0,
  },
  {
    name: 'Amsterdam',
    country: 'Netherlands',
    flag: '🇳🇱',
    coordinates: [4.9, 52.37],
    rotate: [-4.9, -52.37, 0],
    network: 'Network 2',
    online: true,
    serverCount: 0,
  },
  {
    name: 'Mumbai',
    country: 'India',
    flag: '🇮🇳',
    coordinates: [72.88, 19.07],
    rotate: [-72.88, -19.07, 0],
    network: 'Network 3',
    online: true,
    serverCount: 0,
  },
];

const DEFAULT_ROTATE: [number, number, number] = [-80, -10, 0];
const ANIM_DURATION = 800;

interface Props {
  networkStats?: { network: string; up: number; total: number }[];
}

export function WorldMap({ networkStats = [] }: Props) {
  const [rotate, setRotate] = useState<[number, number, number]>(DEFAULT_ROTATE);
  const [scale, setScale] = useState(270);
  const [active, setActive] = useState<string | null>(null);
  const animRef = useRef<number | null>(null);

  const locations = LOCATIONS.map(loc => {
    const stat = networkStats.find(n => n.network === loc.network);
    return {
      ...loc,
      online: stat ? stat.up > 0 : true,
      serverCount: stat?.total ?? 0,
    };
  });

  const rotateTo = useCallback((target: [number, number, number], name: string) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setActive(name);
    const start = performance.now();
    const fromRotate = rotate;

    function step(now: number) {
      const t = Math.min((now - start) / ANIM_DURATION, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setRotate([
        fromRotate[0] + (target[0] - fromRotate[0]) * ease,
        fromRotate[1] + (target[1] - fromRotate[1]) * ease,
        0,
      ]);
      if (t < 1) animRef.current = requestAnimationFrame(step);
    }
    animRef.current = requestAnimationFrame(step);
  }, [rotate]);

  return (
    <div className="relative rounded-xl overflow-hidden"
      style={{
        background: '#020c18',
        border: '1px solid rgba(6,182,212,0.3)',
        boxShadow: '0 0 40px rgba(6,182,212,0.08), inset 0 0 60px rgba(6,182,212,0.03)',
      }}>
      {/* Corner accents */}
      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400/60 rounded-tl-xl z-10" />
      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400/60 rounded-tr-xl z-10" />
      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-xl z-10" />
      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400/60 rounded-br-xl z-10" />

      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(6,182,212,0.15)', background: 'rgba(6,182,212,0.03)' }}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-sm bg-cyan-400" style={{ boxShadow: '0 0 8px rgba(34,211,238,0.8)' }} />
          <h2 className="text-xs font-bold tracking-widest uppercase"
            style={{ color: '#67e8f9', textShadow: '0 0 12px rgba(34,211,238,0.6)' }}>
            Server Locations
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {active && (
            <button onClick={() => {
              if (animRef.current) cancelAnimationFrame(animRef.current);
              const start = performance.now();
              const fromRotate = rotate;
              function step(now: number) {
                const t = Math.min((now - start) / ANIM_DURATION, 1);
                const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                setRotate([
                  fromRotate[0] + (DEFAULT_ROTATE[0] - fromRotate[0]) * ease,
                  fromRotate[1] + (DEFAULT_ROTATE[1] - fromRotate[1]) * ease,
                  0,
                ]);
                if (t < 1) animRef.current = requestAnimationFrame(step);
                else setActive(null);
              }
              animRef.current = requestAnimationFrame(step);
            }} className="text-xs tracking-widest uppercase transition-colors"
              style={{ color: 'rgba(103,232,249,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#67e8f9')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(103,232,249,0.5)')}>
              ↺ Reset
            </button>
          )}
          <span className="flex items-center gap-1.5 text-xs tracking-widest uppercase" style={{ color: 'rgba(34,211,238,0.6)', fontSize: '10px' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 6px #22d3ee' }} /> Online
          </span>
          <span className="flex items-center gap-1.5 text-xs tracking-widest uppercase" style={{ color: 'rgba(248,113,113,0.6)', fontSize: '10px' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" style={{ boxShadow: '0 0 6px #f87171' }} /> Offline
          </span>
        </div>
      </div>

      <div className="relative">
        {/* Globe full width */}
        <div className="w-full relative" style={{ height: '560px', background: 'radial-gradient(ellipse at 60% 50%, #021428 0%, #010912 100%)' }}>
          {/* Vignette keeps globe readable */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 60% 50%, transparent 30%, rgba(1,9,18,0.6) 100%)'
          }} />
          <ComposableMap
            projection="geoOrthographic"
            projectionConfig={{ scale, rotate, center: [0, 0] }}
            style={{ width: '100%', height: '100%' }}
            width={560}
            height={570}
          >
            <defs>
              <radialGradient id="oceanGrad" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#0a2540" />
                <stop offset="100%" stopColor="#020e1f" />
              </radialGradient>
              <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="70%" stopColor="transparent" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.15" />
              </radialGradient>
            </defs>
            <rect x={0} y={0} width={560} height={570} fill="#010912" />
            {/* Ocean */}
            <circle cx={280} cy={285} r={270} fill="url(#oceanGrad)" stroke="#0ea5e9" strokeWidth={0.8} strokeOpacity={0.5} />
            {/* Outer glow ring */}
            <circle cx={280} cy={285} r={273} fill="none" stroke="#38bdf8" strokeWidth={0.4} strokeOpacity={0.3} />
            <circle cx={280} cy={285} r={270} fill="url(#globeGlow)" />
              <Geographies geography={GEO_URL}>
                {({ geographies }: { geographies: any[] }) =>
                  geographies.map(geo => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#0a3060"
                      stroke="#1d7aad"
                      strokeWidth={0.4}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: '#0e4a8a', outline: 'none' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>

              {locations.map(loc => (
                <Marker key={loc.name} coordinates={loc.coordinates}>
                  <circle r={18} fill="#22d3ee" fillOpacity={0.06} stroke="#22d3ee" strokeWidth={0.5} strokeOpacity={0.3} />
                  <circle r={9} fill="none"
                    stroke={loc.online ? '#22d3ee' : '#f87171'}
                    strokeWidth={1} strokeOpacity={0.7} />
                  <circle r={4}
                    fill={active === loc.name ? '#38bdf8' : (loc.online ? '#22d3ee' : '#f87171')}
                    stroke="#020e1f" strokeWidth={1.5} />
                  <text textAnchor="middle" y={-22} style={{
                    fontFamily: 'system-ui, sans-serif', fontSize: '10px',
                    fontWeight: 700, fill: '#bae6fd', pointerEvents: 'none',
                    textShadow: '0 0 8px #0ea5e9',
                  }}>
                    {loc.country}
                  </text>
                  <text textAnchor="middle" y={-12} style={{
                    fontFamily: 'system-ui, sans-serif', fontSize: '8px',
                    fill: '#7dd3fc', pointerEvents: 'none',
                  }}>
                    {loc.serverCount > 0 ? `${loc.serverCount} servers` : loc.network}
                  </text>
                </Marker>
              ))}
          </ComposableMap>

          {/* Country list overlaid on top-left of globe */}
          <div className="absolute top-0 left-0 flex flex-col justify-center h-full px-5 py-6 w-56">
            {locations.map(loc => (
              <button
                key={loc.name}
                onClick={() => rotateTo(loc.rotate, loc.name)}
                className="flex items-center gap-3 py-4 text-left w-full group"
                style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}
              >
                <span className="text-2xl shrink-0 leading-none">{loc.flag}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold tracking-widest uppercase transition-all ${active === loc.name ? 'text-cyan-300' : 'text-white/80 group-hover:text-cyan-400'}`}
                    style={{ textShadow: active === loc.name ? '0 0 14px rgba(34,211,238,0.9)' : undefined }}>
                    {loc.country}
                  </p>
                  <p className="tracking-widest uppercase mt-0.5" style={{ fontSize: '9px', color: 'rgba(6,182,212,0.4)' }}>{loc.network}</p>
                </div>
                {loc.serverCount > 0 && (
                  <span className="text-xs font-bold font-mono shrink-0 px-1.5 py-0.5 rounded"
                    style={{
                      color: '#22d3ee',
                      background: 'rgba(34,211,238,0.08)',
                      border: '1px solid rgba(34,211,238,0.2)',
                      textShadow: '0 0 8px rgba(34,211,238,0.6)',
                    }}>
                    {loc.serverCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
