import { Wifi, WifiOff } from 'lucide-react';

interface NetworkCardProps {
  network: string;
  label: string;
  up: number;
  down: number;
  total: number;
  healthy: number;
  online: boolean;
  error?: string;
}

const NETWORK_COLORS: Record<string, { accent: string; glow: string }> = {
  'physical': { accent: '#22d3ee', glow: 'rgba(34,211,238,0.5)'  },
  'hetzner':  { accent: '#c084fc', glow: 'rgba(192,132,252,0.5)' },
  'third':    { accent: '#4ade80', glow: 'rgba(74,222,128,0.5)'  },
};

function getNetworkColor(network: string) {
  const key = network.toLowerCase();
  for (const [k, v] of Object.entries(NETWORK_COLORS)) {
    if (key.includes(k)) return v;
  }
  return NETWORK_COLORS['physical'];
}

export function NetworkCard({ label, network, up, down, total, healthy, online, error }: NetworkCardProps) {
  const { accent, glow } = getNetworkColor(network);

  const healthColor = !online || healthy < 80 ? '#f87171'
    : healthy < 100 ? '#fbbf24'
    : accent;
  const healthGlow = !online || healthy < 80 ? 'rgba(248,113,113,0.5)'
    : healthy < 100 ? 'rgba(251,191,36,0.5)'
    : glow;
  const healthText = !online || healthy < 80 ? '#f87171'
    : healthy < 100 ? '#fbbf24'
    : accent;

  return (
    <div className="relative rounded-xl p-5 flex flex-col gap-4 overflow-hidden"
      style={{
        background: '#020c18',
        border: `1px solid ${accent}30`,
        boxShadow: `0 0 24px ${accent}08`,
      }}>
      <span className="absolute top-0 left-0 w-3 h-3 border-t border-l rounded-tl-xl" style={{ borderColor: `${accent}60` }} />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r rounded-br-xl" style={{ borderColor: `${accent}60` }} />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-sm" style={{ background: accent, boxShadow: `0 0 8px ${glow}` }} />
          <h3 className="font-bold text-xs tracking-widest uppercase" style={{ color: '#e2e8f0' }}>{label}</h3>
        </div>
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded font-bold tracking-widest uppercase"
          style={online ? {
            color: accent, background: `${accent}12`, border: `1px solid ${accent}35`,
            textShadow: `0 0 8px ${glow}`, fontSize: '9px',
          } : {
            color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
            textShadow: '0 0 8px rgba(248,113,113,0.5)', fontSize: '9px',
          }}>
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {online ? 'Online' : 'Offline'}
        </span>
      </div>

      {error && <p className="text-red-400/70 text-xs truncate">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="tracking-widest uppercase mb-0.5" style={{ color: `${accent}60`, fontSize: '9px' }}>Total</p>
          <p className="font-bold text-2xl font-mono" style={{ color: '#e2e8f0' }}>{total}</p>
        </div>
        <div>
          <p className="tracking-widest uppercase mb-0.5" style={{ color: `${accent}60`, fontSize: '9px' }}>Up</p>
          <p className="font-bold text-2xl font-mono" style={{ color: '#4ade80', textShadow: '0 0 10px rgba(74,222,128,0.5)' }}>{up}</p>
        </div>
        <div>
          <p className="tracking-widest uppercase mb-0.5" style={{ color: `${accent}60`, fontSize: '9px' }}>Down</p>
          <p className="font-bold text-2xl font-mono"
            style={{ color: down > 0 ? '#f87171' : 'rgba(100,116,139,0.4)', textShadow: down > 0 ? '0 0 10px rgba(248,113,113,0.5)' : undefined }}>
            {down}
          </p>
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-1.5">
          <span className="tracking-widest uppercase" style={{ color: `${accent}60`, fontSize: '9px' }}>Health</span>
          <span className="font-bold font-mono text-xs" style={{ color: healthText, textShadow: `0 0 8px ${healthGlow}` }}>
            {online ? `${healthy}%` : 'N/A'}
          </span>
        </div>
        <div className="w-full rounded-full h-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-1 rounded-full transition-all duration-500"
            style={{ width: online ? `${healthy}%` : '0%', background: healthColor, boxShadow: `0 0 6px ${healthGlow}` }} />
        </div>
      </div>
    </div>
  );
}
