'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Plus, RefreshCw, Trash2, Globe, X, ExternalLink, Pencil } from 'lucide-react';
import { CyberBackground } from '@/components/CyberBackground';

function getFaviconUrl(url: string) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

function SiteFavicon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const favicon = getFaviconUrl(url);
  if (!favicon || failed) return <Globe className="w-4 h-4 shrink-0" style={{ color: 'rgba(34,211,238,0.3)' }} />;
  return (
    <Image
      src={favicon}
      alt=""
      width={16}
      height={16}
      className="rounded-sm shrink-0"
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

interface WebsiteCheck {
  id: string;
  status: string;
  statusCode: number | null;
  responseMs: number | null;
  error: string | null;
  checkedAt: string;
}

interface Website {
  id: string;
  name: string;
  url: string;
  expectedStatus: number;
  tags: string[];
  sslExpiresAt: string | null;
  createdAt: string;
  checks: WebsiteCheck[];
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

function uptimePercent(checks: WebsiteCheck[]) {
  if (!checks.length) return null;
  const up = checks.filter(c => c.status === 'up').length;
  return Math.round((up / checks.length) * 100);
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

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

function sslDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.floor((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

function SslBadge({ expiresAt, url }: { expiresAt: string | null; url: string }) {
  if (!url.startsWith('https')) return null;
  const days = sslDays(expiresAt);
  if (days === null) return <span className="text-xs font-mono" style={{ color: 'rgba(148,163,184,0.4)' }}>SSL —</span>;
  const sslStyle: React.CSSProperties = days > 30
    ? { color: '#4ade80', textShadow: '0 0 6px rgba(74,222,128,0.5)' }
    : days > 14
    ? { color: '#facc15', textShadow: '0 0 6px rgba(250,204,21,0.5)' }
    : { color: '#f87171', textShadow: '0 0 6px rgba(248,113,113,0.5)' };
  return <span className="text-xs font-mono font-medium" style={sslStyle}>SSL {days}d</span>;
}

function EditTagsModal({ site, onSave, onClose }: {
  site: Website;
  onSave: (id: string, tags: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [tags, setTags] = useState<string[]>(site.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  }

  function handleTagKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
  }

  async function handleSave() {
    setLoading(true);
    await onSave(site.id, tags);
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(1,9,18,0.85)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-xl p-6 w-full max-w-sm"
        style={{ background: '#020c18', border: '1px solid rgba(34,211,238,0.25)', boxShadow: '0 0 60px rgba(34,211,238,0.15)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base tracking-widest uppercase" style={{ color: '#67e8f9' }}>Edit Tags — {site.name}</h2>
          <button onClick={onClose} style={{ color: 'rgba(34,211,238,0.5)' }} className="transition-colors hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-lg px-3 py-2 min-h-[42px] mb-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)' }}>
          {tags.map(t => (
            <span key={t} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${tagColor(t)}`}>
              {t}
              <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))} className="opacity-60 hover:opacity-100">×</button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKey}
            onBlur={addTag}
            placeholder={tags.length === 0 ? 'production, staging…' : ''}
            className="bg-transparent text-sm outline-none flex-1 min-w-[80px] placeholder-slate-600"
            style={{ color: '#e2e8f0' }}
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 text-sm rounded-lg py-2 transition-colors tracking-widest uppercase"
            style={{ border: '1px solid rgba(34,211,238,0.2)', color: 'rgba(34,211,238,0.5)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 text-white text-sm font-medium rounded-lg py-2 transition-colors disabled:opacity-50 tracking-widest uppercase"
            style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)', boxShadow: '0 0 20px rgba(34,211,238,0.3)' }}>
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddWebsiteModal({ onAdd, onClose }: {
  onAdd: (name: string, url: string, expectedStatus: number, tags: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('https://');
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  }

  function handleTagKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) { setError('Name and URL are required'); return; }
    if (!url.startsWith('http')) { setError('URL must start with http:// or https://'); return; }
    setLoading(true);
    setError('');
    try {
      await onAdd(name.trim(), url.trim(), expectedStatus, tags);
      onClose();
    } catch {
      setError('Failed to add website');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(1,9,18,0.85)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-xl p-6 w-full max-w-md"
        style={{ background: '#020c18', border: '1px solid rgba(34,211,238,0.25)', boxShadow: '0 0 60px rgba(34,211,238,0.15)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base tracking-widest uppercase" style={{ color: '#67e8f9' }}>Add Website</h2>
          <button onClick={onClose} style={{ color: 'rgba(34,211,238,0.5)' }} className="transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="tracking-widest uppercase block mb-1.5" style={{ color: 'rgba(6,182,212,0.6)', fontSize: '10px' }}>Name</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Main Website"
              className="w-full text-sm rounded-lg px-3 py-2 outline-none placeholder-slate-700"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)', color: '#e2e8f0' }}
            />
          </div>
          <div>
            <label className="tracking-widest uppercase block mb-1.5" style={{ color: 'rgba(6,182,212,0.6)', fontSize: '10px' }}>URL</label>
            <input
              value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full text-sm rounded-lg px-3 py-2 outline-none placeholder-slate-700"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)', color: '#e2e8f0' }}
            />
          </div>
          <div>
            <label className="tracking-widest uppercase block mb-1.5" style={{ color: 'rgba(6,182,212,0.6)', fontSize: '10px' }}>Expected Status Code</label>
            <select
              value={expectedStatus} onChange={e => setExpectedStatus(Number(e.target.value))}
              className="w-full text-sm rounded-lg px-3 py-2 outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)', color: '#e2e8f0' }}
            >
              <option value={200}>200 OK</option>
              <option value={201}>201 Created</option>
              <option value={301}>301 Moved Permanently</option>
              <option value={302}>302 Found (Redirect)</option>
              <option value={403}>403 Forbidden</option>
            </select>
          </div>
          <div>
            <label className="tracking-widest uppercase block mb-1.5" style={{ color: 'rgba(6,182,212,0.6)', fontSize: '10px' }}>
              Tags <span style={{ color: 'rgba(148,163,184,0.4)' }}>(press Enter or comma to add)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 rounded-lg px-3 py-2 min-h-[38px]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)' }}>
              {tags.map(t => (
                <span key={t} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${tagColor(t)}`}>
                  {t}
                  <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))} className="opacity-60 hover:opacity-100">×</button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                onBlur={addTag}
                placeholder={tags.length === 0 ? 'production, staging…' : ''}
                className="bg-transparent text-sm outline-none flex-1 min-w-[80px] placeholder-slate-700"
                style={{ color: '#e2e8f0' }}
              />
            </div>
          </div>

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
              {loading ? 'Adding…' : 'Add Website'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editSite, setEditSite] = useState<Website | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchWebsites = useCallback(async () => {
    const res = await fetch('/api/websites', { cache: 'no-store' });
    if (res.ok) {
      const fresh: Website[] = await res.json();
      setWebsites(prev => {
        const prevMap = new Map(prev.map(w => [w.id, w]));
        return fresh.map(w => {
          const existing = prevMap.get(w.id);
          // Preserve local tags if API returns empty — guards against DB race condition
          const tags = w.tags?.length ? w.tags : (existing?.tags ?? []);
          return { ...w, tags };
        });
      });
    }
    setLoading(false);
  }, []);

  const runChecks = useCallback(async () => {
    setChecking(true);
    await fetch('/api/websites/check-all', { method: 'POST' });
    await fetchWebsites();
    setLastChecked(new Date());
    setChecking(false);
  }, [fetchWebsites]);

  useEffect(() => {
    fetchWebsites().then(() => runChecks());
    const interval = setInterval(runChecks, 60000);
    return () => clearInterval(interval);
  }, [fetchWebsites, runChecks]);

  async function handleAdd(name: string, url: string, expectedStatus: number, tags: string[]) {
    const res = await fetch('/api/websites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, expectedStatus, tags }),
    });
    if (!res.ok) throw new Error('Failed to add');
    await runChecks();
  }

  async function handleSaveTags(id: string, tags: string[]) {
    const res = await fetch(`/api/websites/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    if (res.ok) {
      setWebsites(prev => prev.map(w => w.id === id ? { ...w, tags } : w));
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/websites/${id}`, { method: 'DELETE' });
    setWebsites(prev => prev.filter(w => w.id !== id));
  }

  const up = websites.filter(w => w.checks[0]?.status === 'up').length;
  const down = websites.filter(w => w.checks[0] && w.checks[0].status !== 'up').length;

  return (
    <div className="relative p-6">
      <CyberBackground className="fixed inset-0 -z-10" videoId="Im7slkFMtI8" opacity={0.10} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-lg tracking-widest uppercase"
            style={{ color: '#67e8f9', textShadow: '0 0 20px rgba(34,211,238,0.5)' }}>
            Websites
          </h1>
          <p className="text-xs tracking-widest uppercase mt-0.5" style={{ color: 'rgba(6,182,212,0.5)', fontSize: '10px' }}>
            {websites.length > 0
              ? `${up} up · ${down} down · checks every 60s`
              : 'Add websites to start monitoring'}
            {lastChecked && (
              <span style={{ color: 'rgba(6,182,212,0.3)' }} className="ml-2">· {lastChecked.toLocaleTimeString()}</span>
            )}
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
            <Plus className="w-4 h-4" />
            Add Website
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!loading && websites.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
            style={{ background: '#020c18', border: '1px solid rgba(6,182,212,0.18)' }}>
            <Globe className="w-7 h-7" style={{ color: 'rgba(34,211,238,0.3)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'rgba(148,163,184,0.7)' }}>No websites yet</p>
          <p className="text-xs mt-1 mb-5 tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.3)', fontSize: '9px' }}>
            Add your first website to start monitoring
          </p>
          <button onClick={() => setShowModal(true)}
            style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)', color: 'white', boxShadow: '0 0 20px rgba(34,211,238,0.3)' }}
            className="flex items-center gap-2 text-xs font-medium tracking-widest uppercase px-4 py-2 rounded-lg transition-all">
            <Plus className="w-4 h-4" /> Add Website
          </button>
        </div>
      )}

      {/* Website list */}
      {websites.length > 0 && (
        <div className="flex flex-col gap-3">
          {websites.map(site => {
            const latest = site.checks[0];
            return (
              <div key={site.id} className="relative rounded-xl px-5 py-4 overflow-hidden"
                style={{ background: '#020c18', border: '1px solid rgba(6,182,212,0.15)' }}>
                <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-400/30 rounded-tl-xl" />
                <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-400/30 rounded-br-xl" />

                {/* Row 1: name + tags + ssl + status */}
                <div className="flex items-center justify-between mb-2 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={statusDotStyle(latest?.status)} />
                    <span className="font-medium text-sm truncate" style={{ color: '#e2e8f0' }}>{site.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(site.tags ?? []).map(t => (
                      <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${tagColor(t)}`}>{t}</span>
                    ))}
                    <button onClick={() => setEditSite(site)}
                      style={{ color: 'rgba(34,211,238,0.3)' }}
                      className="transition-colors hover:opacity-100">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <SslBadge expiresAt={site.sslExpiresAt} url={site.url} />
                    <span className="font-medium tracking-widest uppercase" style={statusStyle(latest?.status)}>
                      {checking ? '…' : statusLabel(latest?.status)}
                    </span>
                  </div>
                </div>

                {/* Row 2: URL */}
                <a href={site.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs transition-colors mb-3"
                  style={{ color: 'rgba(148,163,184,0.5)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#22d3ee')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.5)')}>
                  <SiteFavicon url={site.url} />
                  <span>{site.url}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>

                {/* Row 3: metrics + history + delete */}
                <div className="flex items-center pt-3 gap-4" style={{ borderTop: '1px solid rgba(8,145,178,0.15)' }}>
                  {/* Left: metrics */}
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
                      <p className="text-sm font-semibold font-mono" style={{ color: '#94a3b8' }}>
                        {latest?.statusCode ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-0.5 tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.4)', fontSize: '9px' }}>Checked</p>
                      <p className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>
                        {latest?.checkedAt ? timeAgo(latest.checkedAt) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Center: response time sparkline */}
                  {site.checks.length > 1 && (
                    <div className="flex items-end gap-px h-8 flex-1">
                      {(() => {
                        const ordered = [...site.checks].reverse();
                        const times = ordered.map(c => c.responseMs ?? 0);
                        const max = Math.max(...times, 1);
                        return ordered.map((c, idx) => {
                          const h = Math.max(2, Math.round(((c.responseMs ?? 0) / max) * 32));
                          const col = c.status !== 'up' ? 'bg-red-500/60' :
                            (c.responseMs ?? 0) < 300 ? 'bg-emerald-500/70' :
                            (c.responseMs ?? 0) < 1000 ? 'bg-yellow-500/70' : 'bg-red-500/70';
                          return (
                            <span
                              key={idx}
                              title={c.responseMs != null ? `${c.responseMs}ms` : c.status}
                              style={{ height: `${h}px` }}
                              className={`w-1.5 rounded-sm ${col} transition-all`}
                            />
                          );
                        });
                      })()}
                    </div>
                  )}

                  {/* Right: uptime history dots + % */}
                  <div className="flex items-center gap-3 shrink-0 justify-end">
                    {site.checks.length > 0 && (
                      <>
                        <div className="flex items-center gap-0.5">
                          {[...site.checks].reverse().map((c, idx) => (
                            <span
                              key={idx}
                              title={`${c.status} · ${timeAgo(c.checkedAt)}`}
                              className={`w-2 h-5 rounded-sm ${
                                c.status === 'up' ? 'bg-emerald-500' :
                                c.status === 'timeout' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            />
                          ))}
                        </div>
                        {(() => {
                          const pct = uptimePercent(site.checks);
                          const pctStyle: React.CSSProperties = pct === 100
                            ? { color: '#4ade80', textShadow: '0 0 6px rgba(74,222,128,0.5)' }
                            : pct != null && pct >= 90
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
                    <button onClick={() => handleDelete(site.id)}
                      className="transition-colors p-1 rounded ml-2"
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

      {showModal && (
        <AddWebsiteModal onAdd={handleAdd} onClose={() => setShowModal(false)} />
      )}
      {editSite && (
        <EditTagsModal site={editSite} onSave={handleSaveTags} onClose={() => setEditSite(null)} />
      )}
    </div>
  );
}
