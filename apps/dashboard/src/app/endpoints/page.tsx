'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Plus, RefreshCw, Trash2, Globe, X, ExternalLink, Pencil, ChevronDown, ChevronUp } from 'lucide-react';

interface EndpointCheck {
  id: string;
  status: string;
  statusCode: number | null;
  responseMs: number | null;
  error: string | null;
  checkedAt: string;
}

interface Endpoint {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  expectedStatus: number;
  tags: string[];
  createdAt: string;
  checks: EndpointCheck[];
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

// Method badge styles with cyber glow
const METHOD_STYLES: Record<string, React.CSSProperties> = {
  GET:    { color: '#22d3ee', background: 'rgba(34,211,238,0.1)',  border: '1px solid rgba(34,211,238,0.25)',  textShadow: '0 0 6px rgba(34,211,238,0.5)' },
  POST:   { color: '#4ade80', background: 'rgba(74,222,128,0.1)',  border: '1px solid rgba(74,222,128,0.25)',  textShadow: '0 0 6px rgba(74,222,128,0.5)' },
  PUT:    { color: '#facc15', background: 'rgba(250,204,21,0.1)',  border: '1px solid rgba(250,204,21,0.25)',  textShadow: '0 0 6px rgba(250,204,21,0.5)' },
  PATCH:  { color: '#fb923c', background: 'rgba(251,146,60,0.1)',  border: '1px solid rgba(251,146,60,0.25)',  textShadow: '0 0 6px rgba(251,146,60,0.5)' },
  DELETE: { color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', textShadow: '0 0 6px rgba(248,113,113,0.5)' },
  HEAD:   { color: '#c084fc', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.25)', textShadow: '0 0 6px rgba(192,132,252,0.5)' },
};

const TAG_COLORS = [
  'bg-blue-500/20 text-blue-300',
  'bg-purple-500/20 text-purple-300',
  'bg-pink-500/20 text-pink-300',
  'bg-orange-500/20 text-orange-300',
  'bg-teal-500/20 text-teal-300',
  'bg-indigo-500/20 text-indigo-300',
];

function tagColor(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) % TAG_COLORS.length;
  return TAG_COLORS[h];
}

function statusStyle(status: string | undefined): React.CSSProperties {
  if (!status) return { color: 'rgba(148,163,184,0.5)', fontSize: '9px' };
  if (status === 'up') return { color: '#4ade80', textShadow: '0 0 8px rgba(74,222,128,0.7)', fontSize: '9px' };
  if (status === 'timeout') return { color: '#facc15', textShadow: '0 0 8px rgba(250,204,21,0.7)', fontSize: '9px' };
  return { color: '#f87171', textShadow: '0 0 8px rgba(248,113,113,0.7)', fontSize: '9px' };
}

function statusDotStyle(status: string | undefined): React.CSSProperties {
  if (!status) return { background: 'rgba(148,163,184,0.4)' };
  if (status === 'up') return { background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.9)' };
  if (status === 'timeout') return { background: '#facc15', boxShadow: '0 0 6px rgba(250,204,21,0.9)' };
  return { background: '#f87171', boxShadow: '0 0 6px rgba(248,113,113,0.9)' };
}

function statusLabel(status: string | undefined) {
  if (!status) return 'Pending';
  if (status === 'up') return 'Up';
  if (status === 'timeout') return 'Timeout';
  return 'Down';
}

function responseStyle(ms: number | null): React.CSSProperties {
  if (!ms) return { color: 'rgba(148,163,184,0.5)' };
  if (ms < 300) return { color: '#4ade80', textShadow: '0 0 6px rgba(74,222,128,0.5)' };
  if (ms < 1000) return { color: '#facc15', textShadow: '0 0 6px rgba(250,204,21,0.5)' };
  return { color: '#f87171', textShadow: '0 0 6px rgba(248,113,113,0.5)' };
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function uptimePercent(checks: EndpointCheck[]) {
  if (!checks.length) return null;
  return Math.round((checks.filter(c => c.status === 'up').length / checks.length) * 100);
}

function getFaviconUrl(url: string) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
  } catch { return null; }
}

function SiteFavicon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const favicon = getFaviconUrl(url);
  if (!favicon || failed) return <Globe className="w-4 h-4 shrink-0" style={{ color: 'rgba(34,211,238,0.3)' }} />;
  return <Image src={favicon} alt="" width={16} height={16} className="rounded-sm shrink-0"
    onError={() => setFailed(true)} unoptimized />;
}

function TagsInput({ tags, setTags }: { tags: string[]; setTags: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  function add() {
    const t = input.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setInput('');
  }
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg px-3 py-2 min-h-[38px]"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)' }}>
      {tags.map(t => (
        <span key={t} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${tagColor(t)}`}>
          {t}
          <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} className="opacity-60 hover:opacity-100">×</button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={tags.length === 0 ? 'production, staging…' : ''}
        className="bg-transparent text-sm outline-none flex-1 min-w-[80px] placeholder-slate-700"
        style={{ color: '#e2e8f0' }} />
    </div>
  );
}

function HeadersEditor({ headers, setHeaders }: {
  headers: Record<string, string>;
  setHeaders: (h: Record<string, string>) => void;
}) {
  const [pairs, setPairs] = useState<{ key: string; value: string }[]>(
    Object.entries(headers).map(([key, value]) => ({ key, value }))
  );

  function update(idx: number, field: 'key' | 'value', val: string) {
    const next = pairs.map((p, i) => i === idx ? { ...p, [field]: val } : p);
    setPairs(next);
    setHeaders(Object.fromEntries(next.filter(p => p.key).map(p => [p.key, p.value])));
  }

  function addRow() { setPairs(prev => [...prev, { key: '', value: '' }]); }
  function removeRow(idx: number) {
    const next = pairs.filter((_, i) => i !== idx);
    setPairs(next);
    setHeaders(Object.fromEntries(next.filter(p => p.key).map(p => [p.key, p.value])));
  }

  return (
    <div className="space-y-2">
      {pairs.map((p, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input value={p.key} onChange={e => update(i, 'key', e.target.value)}
            placeholder="Header name"
            className="flex-1 text-xs rounded-lg px-2 py-1.5 outline-none placeholder-slate-700"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)', color: '#e2e8f0' }} />
          <input value={p.value} onChange={e => update(i, 'value', e.target.value)}
            placeholder="Value"
            className="flex-1 text-xs rounded-lg px-2 py-1.5 outline-none placeholder-slate-700"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)', color: '#e2e8f0' }} />
          <button type="button" onClick={() => removeRow(i)}
            className="text-lg leading-none transition-colors"
            style={{ color: 'rgba(148,163,184,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.4)')}>×</button>
        </div>
      ))}
      <button type="button" onClick={addRow}
        className="text-xs transition-colors tracking-widest uppercase"
        style={{ color: 'rgba(34,211,238,0.5)' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#22d3ee')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(34,211,238,0.5)')}>
        + Add header
      </button>
    </div>
  );
}

function AddEndpointModal({ onAdd, onClose }: {
  onAdd: (data: Partial<Endpoint>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('https://');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [body, setBody] = useState('');
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [tags, setTags] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) { setError('Name and URL are required'); return; }
    if (!url.startsWith('http')) { setError('URL must start with http:// or https://'); return; }
    setLoading(true);
    setError('');
    try {
      await onAdd({ name: name.trim(), url: url.trim(), method, headers, body: body || undefined, expectedStatus, tags });
      onClose();
    } catch {
      setError('Failed to add endpoint');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(1,9,18,0.85)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: '#020c18', border: '1px solid rgba(34,211,238,0.25)', boxShadow: '0 0 60px rgba(34,211,238,0.15)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base tracking-widest uppercase" style={{ color: '#67e8f9' }}>Add Endpoint</h2>
          <button onClick={onClose} style={{ color: 'rgba(34,211,238,0.5)' }} className="transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="tracking-widest uppercase block mb-1.5" style={{ color: 'rgba(6,182,212,0.6)', fontSize: '10px' }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Auth API health"
              className="w-full text-sm rounded-lg px-3 py-2 outline-none placeholder-slate-700"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)', color: '#e2e8f0' }} />
          </div>

          <div className="flex gap-2">
            <div className="w-28 shrink-0">
              <label className="tracking-widest uppercase block mb-1.5" style={{ color: 'rgba(6,182,212,0.6)', fontSize: '10px' }}>Method</label>
              <select value={method} onChange={e => setMethod(e.target.value)}
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)', color: '#e2e8f0' }}>
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="tracking-widest uppercase block mb-1.5" style={{ color: 'rgba(6,182,212,0.6)', fontSize: '10px' }}>URL</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.example.com/health"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none placeholder-slate-700"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)', color: '#e2e8f0' }} />
            </div>
          </div>

          <div>
            <label className="tracking-widest uppercase block mb-1.5" style={{ color: 'rgba(6,182,212,0.6)', fontSize: '10px' }}>Expected Status</label>
            <select value={expectedStatus} onChange={e => setExpectedStatus(Number(e.target.value))}
              className="w-full text-sm rounded-lg px-3 py-2 outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)', color: '#e2e8f0' }}>
              <option value={200}>200 OK</option>
              <option value={201}>201 Created</option>
              <option value={204}>204 No Content</option>
              <option value={301}>301 Redirect</option>
              <option value={401}>401 Unauthorized</option>
              <option value={403}>403 Forbidden</option>
            </select>
          </div>

          <div>
            <label className="tracking-widest uppercase block mb-1.5" style={{ color: 'rgba(6,182,212,0.6)', fontSize: '10px' }}>
              Tags <span style={{ color: 'rgba(148,163,184,0.4)' }}>(Enter or comma)</span>
            </label>
            <TagsInput tags={tags} setTags={setTags} />
          </div>

          <button type="button" onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1.5 text-xs transition-colors tracking-widest uppercase"
            style={{ color: 'rgba(34,211,238,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(34,211,238,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(34,211,238,0.4)')}>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showAdvanced ? 'Hide' : 'Show'} advanced (headers, body)
          </button>

          {showAdvanced && (
            <>
              <div>
                <label className="tracking-widest uppercase block mb-1.5" style={{ color: 'rgba(6,182,212,0.6)', fontSize: '10px' }}>Request Headers</label>
                <HeadersEditor headers={headers} setHeaders={setHeaders} />
              </div>
              {(method === 'POST' || method === 'PUT' || method === 'PATCH') && (
                <div>
                  <label className="tracking-widest uppercase block mb-1.5" style={{ color: 'rgba(6,182,212,0.6)', fontSize: '10px' }}>
                    Request Body <span style={{ color: 'rgba(148,163,184,0.4)' }}>(JSON)</span>
                  </label>
                  <textarea value={body} onChange={e => setBody(e.target.value)}
                    placeholder='{"key": "value"}' rows={3}
                    className="w-full text-xs font-mono rounded-lg px-3 py-2 outline-none placeholder-slate-700 resize-none"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)', color: '#e2e8f0' }} />
                </div>
              )}
            </>
          )}

          {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 text-sm rounded-lg py-2 transition-colors tracking-widest uppercase"
              style={{ border: '1px solid rgba(34,211,238,0.2)', color: 'rgba(34,211,238,0.5)' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 text-white text-sm font-medium rounded-lg py-2 transition-colors disabled:opacity-50 tracking-widest uppercase"
              style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)', boxShadow: '0 0 20px rgba(34,211,238,0.3)' }}>
              {loading ? 'Adding…' : 'Add Endpoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTagsModal({ ep, onSave, onClose }: {
  ep: Endpoint;
  onSave: (id: string, tags: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [tags, setTags] = useState<string[]>(ep.tags ?? []);
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(1,9,18,0.85)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-xl p-6 w-full max-w-sm"
        style={{ background: '#020c18', border: '1px solid rgba(34,211,238,0.25)', boxShadow: '0 0 60px rgba(34,211,238,0.15)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base tracking-widest uppercase" style={{ color: '#67e8f9' }}>Edit Tags — {ep.name}</h2>
          <button onClick={onClose} style={{ color: 'rgba(34,211,238,0.5)' }} className="transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mb-4">
          <TagsInput tags={tags} setTags={setTags} />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 text-sm rounded-lg py-2 transition-colors tracking-widest uppercase"
            style={{ border: '1px solid rgba(34,211,238,0.2)', color: 'rgba(34,211,238,0.5)' }}>
            Cancel
          </button>
          <button disabled={loading} onClick={async () => {
            setLoading(true);
            await onSave(ep.id, tags);
            setLoading(false);
            onClose();
          }}
            className="flex-1 text-white text-sm font-medium rounded-lg py-2 transition-colors disabled:opacity-50 tracking-widest uppercase"
            style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)', boxShadow: '0 0 20px rgba(34,211,238,0.3)' }}>
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editEp, setEditEp] = useState<Endpoint | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'up' | 'down'>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');

  const fetchEndpoints = useCallback(async () => {
    const res = await fetch('/api/endpoints', { cache: 'no-store' });
    if (res.ok) {
      const fresh: Endpoint[] = await res.json();
      setEndpoints(prev => {
        const prevMap = new Map(prev.map(e => [e.id, e]));
        return fresh.map(e => {
          const existing = prevMap.get(e.id);
          const tags = e.tags?.length ? e.tags : (existing?.tags ?? []);
          return { ...e, tags };
        });
      });
    }
    setLoading(false);
  }, []);

  const runChecks = useCallback(async () => {
    setChecking(true);
    await fetch('/api/endpoints/check-all', { method: 'POST' });
    await fetchEndpoints();
    setLastChecked(new Date());
    setChecking(false);
  }, [fetchEndpoints]);

  useEffect(() => {
    fetchEndpoints().then(() => runChecks());
    const interval = setInterval(runChecks, 60000);
    return () => clearInterval(interval);
  }, [fetchEndpoints, runChecks]);

  async function handleAdd(data: Partial<Endpoint>) {
    const res = await fetch('/api/endpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add');
    await runChecks();
  }

  async function handleSaveTags(id: string, tags: string[]) {
    const res = await fetch(`/api/endpoints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    if (res.ok) setEndpoints(prev => prev.map(e => e.id === id ? { ...e, tags } : e));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/endpoints/${id}`, { method: 'DELETE' });
    setEndpoints(prev => prev.filter(e => e.id !== id));
  }

  const up = endpoints.filter(e => e.checks[0]?.status === 'up').length;
  const down = endpoints.filter(e => e.checks[0] && e.checks[0].status !== 'up').length;
  const avgResponse = (() => {
    const vals = endpoints.map(e => e.checks[0]?.responseMs).filter((v): v is number => v != null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  })();
  const methodsUsed = [...new Set(endpoints.map(e => e.method))].sort();

  const filtered = endpoints.filter(e => {
    if (filterStatus === 'up' && e.checks[0]?.status !== 'up') return false;
    if (filterStatus === 'down' && (!e.checks[0] || e.checks[0].status === 'up')) return false;
    if (filterMethod !== 'all' && e.method !== filterMethod) return false;
    return true;
  });

  const avgResponseStyle: React.CSSProperties = avgResponse == null
    ? { color: 'rgba(148,163,184,0.4)' }
    : avgResponse < 300
    ? { color: '#4ade80', textShadow: '0 0 8px rgba(74,222,128,0.5)' }
    : avgResponse < 1000
    ? { color: '#facc15', textShadow: '0 0 8px rgba(250,204,21,0.5)' }
    : { color: '#f87171', textShadow: '0 0 8px rgba(248,113,113,0.5)' };

  return (
    <div className="relative p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-lg tracking-widest uppercase"
            style={{ color: '#67e8f9', textShadow: '0 0 20px rgba(34,211,238,0.5)' }}>
            Endpoints
          </h1>
          <p className="text-xs tracking-widest uppercase mt-0.5" style={{ color: 'rgba(6,182,212,0.5)', fontSize: '10px' }}>
            {endpoints.length > 0
              ? `${up} up · ${down} down · checks every 60s`
              : 'Add API endpoints to start monitoring'}
            {lastChecked && <span style={{ color: 'rgba(6,182,212,0.3)' }} className="ml-2">· {lastChecked.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runChecks} disabled={checking}
            style={{ color: 'rgba(34,211,238,0.6)', border: '1px solid rgba(34,211,238,0.2)', background: 'rgba(34,211,238,0.04)' }}
            className="flex items-center gap-2 text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking…' : 'Check Now'}
          </button>
          <button onClick={() => setShowModal(true)}
            style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)', color: 'white', boxShadow: '0 0 20px rgba(34,211,238,0.3)' }}
            className="flex items-center gap-2 text-xs font-medium tracking-widest uppercase px-4 py-1.5 rounded-lg transition-all">
            <Plus className="w-4 h-4" /> Add Endpoint
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {endpoints.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Total', value: endpoints.length, style: { color: '#e2e8f0' } },
            { label: 'Up', value: up, style: { color: '#4ade80', textShadow: '0 0 8px rgba(74,222,128,0.5)' } },
            { label: 'Down', value: down, style: down > 0 ? { color: '#f87171', textShadow: '0 0 8px rgba(248,113,113,0.5)' } : { color: 'rgba(148,163,184,0.3)' } },
            {
              label: 'Avg Response',
              value: avgResponse != null
                ? avgResponse < 1000 ? `${avgResponse}ms` : `${(avgResponse / 1000).toFixed(1)}s`
                : '—',
              style: avgResponseStyle,
            },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-4"
              style={{ background: '#020c18', border: '1px solid rgba(6,182,212,0.18)' }}>
              <p className="text-xs mb-1 tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.4)', fontSize: '9px' }}>{stat.label}</p>
              <p className="text-2xl font-semibold" style={stat.style}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      {endpoints.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1 rounded-lg p-1"
            style={{ background: 'rgba(1,9,18,0.6)', border: '1px solid rgba(34,211,238,0.15)' }}>
            {(['all', 'up', 'down'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="px-3 py-1 rounded text-xs font-medium transition-all capitalize tracking-widest uppercase"
                style={filterStatus === s
                  ? { background: 'rgba(34,211,238,0.12)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)' }
                  : { color: 'rgba(148,163,184,0.5)', border: '1px solid transparent' }}>
                {s === 'all' ? 'All Status' : s === 'up' ? `Up (${up})` : `Down (${down})`}
              </button>
            ))}
          </div>

          {methodsUsed.length > 1 && (
            <div className="flex items-center gap-1 rounded-lg p-1"
              style={{ background: 'rgba(1,9,18,0.6)', border: '1px solid rgba(34,211,238,0.15)' }}>
              <button onClick={() => setFilterMethod('all')}
                className="px-3 py-1 rounded text-xs font-medium transition-all tracking-widest uppercase"
                style={filterMethod === 'all'
                  ? { background: 'rgba(34,211,238,0.12)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)' }
                  : { color: 'rgba(148,163,184,0.5)', border: '1px solid transparent' }}>
                All Methods
              </button>
              {methodsUsed.map(m => (
                <button key={m} onClick={() => setFilterMethod(m)}
                  className="px-3 py-1 rounded text-xs font-medium transition-all tracking-widest uppercase"
                  style={filterMethod === m
                    ? { background: 'rgba(34,211,238,0.12)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)' }
                    : { color: 'rgba(148,163,184,0.5)', border: '1px solid transparent' }}>
                  {m}
                </button>
              ))}
            </div>
          )}

          {(filterStatus !== 'all' || filterMethod !== 'all') && (
            <button onClick={() => { setFilterStatus('all'); setFilterMethod('all'); }}
              className="text-xs transition-colors tracking-widest uppercase"
              style={{ color: 'rgba(34,211,238,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#22d3ee')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(34,211,238,0.4)')}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && endpoints.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
            style={{ background: '#020c18', border: '1px solid rgba(6,182,212,0.18)' }}>
            <ExternalLink className="w-7 h-7" style={{ color: 'rgba(34,211,238,0.3)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'rgba(148,163,184,0.7)' }}>No endpoints yet</p>
          <p className="mt-1 mb-5 tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.3)', fontSize: '9px' }}>
            Add your first API endpoint to start monitoring
          </p>
          <button onClick={() => setShowModal(true)}
            style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)', color: 'white', boxShadow: '0 0 20px rgba(34,211,238,0.3)' }}
            className="flex items-center gap-2 text-xs font-medium tracking-widest uppercase px-4 py-2 rounded-lg transition-all">
            <Plus className="w-4 h-4" /> Add Endpoint
          </button>
        </div>
      )}

      {/* Filtered empty state */}
      {endpoints.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.3)', fontSize: '9px' }}>
          No endpoints match the current filters.
        </div>
      )}

      {/* Endpoint cards */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map(ep => {
            const latest = ep.checks[0];
            const pct = uptimePercent(ep.checks);
            return (
              <div key={ep.id} className="relative rounded-xl px-5 py-4 overflow-hidden"
                style={{ background: '#020c18', border: '1px solid rgba(6,182,212,0.15)' }}>
                <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-400/30 rounded-tl-xl" />
                <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-400/30 rounded-br-xl" />

                {/* Row 1: method + name + tags + status */}
                <div className="flex items-center justify-between mb-2 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={statusDotStyle(latest?.status)} />
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded font-mono shrink-0 tracking-widest"
                      style={METHOD_STYLES[ep.method] ?? { color: 'rgba(148,163,184,0.6)', background: 'rgba(148,163,184,0.08)' }}>
                      {ep.method}
                    </span>
                    <span className="font-medium text-sm truncate" style={{ color: '#e2e8f0' }}>{ep.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(ep.tags ?? []).map(t => (
                      <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${tagColor(t)}`}>{t}</span>
                    ))}
                    <button onClick={() => setEditEp(ep)}
                      style={{ color: 'rgba(34,211,238,0.3)' }}
                      className="transition-colors hover:opacity-100">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <span className="font-medium tracking-widest uppercase" style={statusStyle(latest?.status)}>
                      {checking ? '…' : statusLabel(latest?.status)}
                    </span>
                  </div>
                </div>

                {/* Row 2: URL */}
                <a href={ep.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs transition-colors mb-3"
                  style={{ color: 'rgba(148,163,184,0.5)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#22d3ee')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.5)')}>
                  <SiteFavicon url={ep.url} />
                  <span className="truncate font-mono">{ep.url}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>

                {/* Row 3: metrics + sparkline + uptime */}
                <div className="flex items-center pt-3 gap-4" style={{ borderTop: '1px solid rgba(6,182,212,0.08)' }}>
                  <div className="flex items-center gap-6 shrink-0">
                    <div>
                      <p className="text-xs mb-0.5 tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.4)', fontSize: '9px' }}>Response</p>
                      <p className="text-sm font-semibold font-mono" style={responseStyle(latest?.responseMs ?? null)}>
                        {latest?.responseMs != null
                          ? latest.responseMs < 1000 ? `${latest.responseMs}ms` : `${(latest.responseMs / 1000).toFixed(1)}s`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-0.5 tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.4)', fontSize: '9px' }}>Status</p>
                      <p className="text-sm font-semibold font-mono" style={{ color: '#94a3b8' }}>{latest?.statusCode ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs mb-0.5 tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.4)', fontSize: '9px' }}>Checked</p>
                      <p className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>{latest?.checkedAt ? timeAgo(latest.checkedAt) : '—'}</p>
                    </div>
                  </div>

                  {ep.checks.length > 1 && (
                    <div className="flex items-end gap-px h-8 flex-1">
                      {(() => {
                        const ordered = [...ep.checks].reverse();
                        const max = Math.max(...ordered.map(c => c.responseMs ?? 0), 1);
                        return ordered.map((c, idx) => {
                          const h = Math.max(2, Math.round(((c.responseMs ?? 0) / max) * 32));
                          const col = c.status !== 'up' ? 'bg-red-500/60'
                            : (c.responseMs ?? 0) < 300 ? 'bg-emerald-500/70'
                            : (c.responseMs ?? 0) < 1000 ? 'bg-yellow-500/70' : 'bg-red-500/70';
                          return <span key={idx} title={c.responseMs != null ? `${c.responseMs}ms` : c.status}
                            style={{ height: `${h}px` }} className={`w-1.5 rounded-sm ${col}`} />;
                        });
                      })()}
                    </div>
                  )}

                  <div className="flex items-center gap-3 shrink-0">
                    {ep.checks.length > 0 && (
                      <>
                        <div className="flex items-center gap-0.5">
                          {[...ep.checks].reverse().map((c, idx) => (
                            <span key={idx} title={`${c.status} · ${timeAgo(c.checkedAt)}`}
                              className={`w-2 h-5 rounded-sm ${c.status === 'up' ? 'bg-emerald-500' : c.status === 'timeout' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                          ))}
                        </div>
                        {pct !== null && (() => {
                          const pctStyle: React.CSSProperties = pct === 100
                            ? { color: '#4ade80', textShadow: '0 0 6px rgba(74,222,128,0.5)' }
                            : pct >= 90
                            ? { color: '#facc15', textShadow: '0 0 6px rgba(250,204,21,0.5)' }
                            : { color: '#f87171', textShadow: '0 0 6px rgba(248,113,113,0.5)' };
                          return (
                            <span className="text-sm font-semibold font-mono shrink-0" style={pctStyle}>
                              {pct}%
                            </span>
                          );
                        })()}
                      </>
                    )}
                    <button onClick={() => handleDelete(ep.id)}
                      className="transition-colors p-1 rounded ml-1"
                      style={{ color: 'rgba(148,163,184,0.3)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.3)')}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {latest?.error && latest.status !== 'up' && (
                  <p className="text-xs mt-2 truncate" style={{ color: 'rgba(248,113,113,0.7)' }}>{latest.error}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && <AddEndpointModal onAdd={handleAdd} onClose={() => setShowModal(false)} />}
      {editEp && <EditTagsModal ep={editEp} onSave={handleSaveTags} onClose={() => setEditEp(null)} />}
    </div>
  );
}
