import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import HeroStat from './components/HeroStat';
import AlertBanner from './components/AlertBanner';
import DateWindowTabs from './components/DateWindowTabs';
import PriceChart from './components/PriceChart';
import FlightsList from './components/FlightsList';

const API = import.meta.env.VITE_API_URL ?? '';

const WINDOWS = [
  { id: 1, label: 'Christmas & New Year', season: 'Summer', dateRange: 'Dec 10 – Jan 20' },
  { id: 2, label: 'Sri Lankan New Year', season: 'Autumn', dateRange: 'Apr 5 – Apr 20' },
];

// ── Radar Overlay ─────────────────────────────────────────────────────────────
function RadarOverlay({ scraping, scanStep }) {
  const statusItems = [
    { label: 'Christmas & New Year window', done: scanStep >= 1 },
    { label: 'Sri Lankan New Year window', done: scanStep >= 2 },
    { label: 'Checking alerts', done: scanStep === 'done' },
  ];
  if (!scraping) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 99999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0a0a0a', border: '0.5px solid #1a1a1a', borderRadius: 20,
        padding: '40px 40px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 24, width: '100%', maxWidth: 360, margin: '0 16px',
      }}>
        <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute', width: 120, height: 120, borderRadius: '50%',
              border: '1px solid #C17B2A',
              animation: `radarExpand 2s ease-out ${i * 0.65}s infinite`,
            }} />
          ))}
          <div style={{
            position: 'absolute', width: 60, height: 60, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 70%, rgba(193,123,42,0.45) 100%)',
            animation: 'radarSweep 2s linear infinite',
          }} />
          <div style={{
            position: 'absolute', width: 60, height: 60, borderRadius: '50%',
            background: 'rgba(193,123,42,0.08)', border: '1.5px solid rgba(193,123,42,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>🦊</div>
          {[
            { top: '16%', right: '14%', delay: '0.3s' },
            { bottom: '18%', left: '14%', delay: '0.9s' },
            { top: '52%', left: '10%', delay: '1.5s' },
          ].map((b, i) => (
            <div key={i} style={{
              position: 'absolute', width: 5, height: 5, borderRadius: '50%',
              background: '#C17B2A', top: b.top, right: b.right, bottom: b.bottom, left: b.left,
              animation: `blipPulse 2s ease-in-out ${b.delay} infinite`,
            }} />
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#fff', fontWeight: 500, fontSize: 15 }}>Scanning for fares…</p>
          <p style={{ color: '#C17B2A', fontWeight: 500, fontSize: 13, marginTop: 6 }}>MEL → CMB</p>
          <p style={{ color: '#555', fontSize: 12, marginTop: 4 }}>Checking Jetstar & SriLankan Airlines</p>
        </div>
        <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: 'linear-gradient(90deg,#C17B2A,#E8973A)',
            animation: 'progressScan 24s ease-in-out forwards',
          }} />
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {statusItems.map((item, i) => {
            const isActive = !item.done && (
              (i === 0 && scanStep === 0) || (i === 1 && scanStep === 1) || (i === 2 && scanStep === 2)
            );
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: item.done ? '#22c55e' : (isActive ? '#C17B2A' : '#333'),
                  animation: isActive ? 'activePulse 1s ease-in-out infinite' : 'none',
                }} />
                <span style={{
                  fontSize: 11,
                  color: item.done ? '#555' : (isActive ? '#C17B2A' : '#333'),
                  fontWeight: isActive ? 500 : 400,
                }}>
                  {item.label}{item.done ? ' ✓' : (isActive ? '…' : '')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Windows Page ───────────────────────────────────────────────────────────────
function WindowsPage({ windows, flights1, flights2, history1, history2, status }) {
  const getWindowData = (wid, flights, history) => {
    const cheapest = flights.length > 0 ? Math.min(...flights.map(f => f.price_aud)) : null;
    const today = history[history.length - 1]?.minPrice ?? null;
    const yesterday = history[history.length - 2]?.minPrice ?? null;
    const diff = today && yesterday ? Math.round(today - yesterday) : null;
    const win = windows.find(w => w.id === wid);
    const daysUntil = win?.startDate
      ? Math.max(0, Math.ceil((new Date(win.startDate) - new Date()) / (1000 * 60 * 60 * 24)))
      : null;
    return { cheapest, diff, daysUntil };
  };
  const w1 = getWindowData(1, flights1, history1);
  const w2 = getWindowData(2, flights2, history2);
  const windowData = [w1, w2];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Travel windows</p>
      {windows.map((win, i) => {
        const { cheapest, diff, daysUntil } = windowData[i];
        return (
          <div key={win.id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{win.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{win.dateRange}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-xs font-medium" style={{ color: '#C17B2A' }}>{win.season}</span>
                {daysUntil !== null && (
                  <span className="text-xs text-white px-2 py-0.5 rounded-full" style={{ background: '#C17B2A' }}>
                    {daysUntil === 0 ? 'Window open' : `${daysUntil} days`}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-50">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-400">Cheapest</span>
                <span className="text-sm font-medium text-gray-900">
                  {cheapest ? `A$${cheapest.toLocaleString()}` : '—'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-400">Last scan</span>
                <span className="text-sm font-medium text-gray-900">
                  {status?.lastRun
                    ? new Date(status.lastRun).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })
                    : '—'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-400">Vs yesterday</span>
                <span className={`text-sm font-medium ${diff === null ? 'text-gray-400' : diff < 0 ? 'text-green-500' : diff > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {diff === null ? '—' : diff < 0 ? `↓ $${Math.abs(diff)}` : diff > 0 ? `↑ $${diff}` : 'No change'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Alerts Page ────────────────────────────────────────────────────────────────
function AlertsPage() {
  const [email, setEmail]         = useState('');
  const [threshold, setThreshold] = useState(1100);
  const [window1, setWindow1]     = useState(true);
  const [window2, setWindow2]     = useState(true);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!window1 && !window2) {
      setError('Please select at least one travel window.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, threshold, window_1: window1, window_2: window2 }),
      });
      if (!res.ok) throw new Error('Failed to subscribe');
      setSuccess(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-800 mb-1">You're subscribed</p>
          <p className="text-xs text-gray-400 max-w-xs">
            You'll receive an email when MEL→CMB fares drop below A${threshold.toLocaleString()}.
          </p>
          <button onClick={() => setSuccess(false)}
            className="mt-5 text-xs px-4 py-2 rounded-lg border border-gray-100 text-gray-400 hover:text-gray-600 transition-all">
            Update preferences
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Email alerts</p>

      {/* Email input */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Your email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-800 placeholder-gray-300 focus:outline-none focus:border-amber-300 transition-all"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Threshold */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-gray-400">Alert me when fares drop below</label>
          <span className="text-sm font-medium" style={{ color: '#C17B2A' }}>A${threshold.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={700} max={1500} step={50}
          value={threshold}
          onChange={e => setThreshold(parseInt(e.target.value))}
          className="w-full"
          style={{ accentColor: '#C17B2A' }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-300">A$700</span>
          <span className="text-xs text-gray-300">A$1,500</span>
        </div>
      </div>

      {/* Window toggles */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Christmas & New Year</p>
            <p className="text-xs text-gray-400 mt-0.5">Dec 10 – Jan 20 · Summer</p>
          </div>
          <button onClick={() => setWindow1(v => !v)}
            className="relative flex-shrink-0 w-10 h-6 rounded-full transition-all"
            style={{ background: window1 ? '#C17B2A' : '#e5e5e3' }}>
            <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: window1 ? '22px' : '2px' }} />
          </button>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Sri Lankan New Year</p>
            <p className="text-xs text-gray-400 mt-0.5">Apr 5 – Apr 20 · Autumn</p>
          </div>
          <button onClick={() => setWindow2(v => !v)}
            className="relative flex-shrink-0 w-10 h-6 rounded-full transition-all"
            style={{ background: window2 ? '#C17B2A' : '#e5e5e3' }}>
            <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: window2 ? '22px' : '2px' }} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 px-1">{error}</p>
      )}

      {/* Submit */}
      <button onClick={handleSubmit} disabled={loading}
        className="w-full py-3 rounded-2xl text-sm font-medium text-white transition-all active:scale-95 disabled:opacity-50"
        style={{ background: '#C17B2A' }}>
        {loading ? 'Subscribing…' : 'Subscribe to alerts'}
      </button>

      <p className="text-center text-xs text-gray-300 pb-4">
        You'll receive an email after each scan when fares drop below your threshold.
      </p>
    </div>
  );
}

// ── About Page ─────────────────────────────────────────────────────────────────
function AboutPage({ status, isAdmin }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">

      {/* Logo block */}
      <div className="flex flex-col items-center py-4">
        <div className="leading-none mb-1">
          <span className="text-2xl font-medium" style={{ letterSpacing: '-0.03em', color: '#111' }}>Fare</span>
          <span className="text-2xl font-medium" style={{ letterSpacing: '-0.03em', color: '#C17B2A' }}>fox</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Your family's flight radar</p>
        <p className="text-xs text-gray-300 mt-0.5">v1.0.0</p>
      </div>

      {/* Last scan + total scans */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Last scan</p>
          <p className="text-sm font-medium text-gray-900 mt-0.5">
            {status?.lastRun
              ? new Date(status.lastRun).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
              : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total scans</p>
          <p className="text-sm font-medium mt-0.5" style={{ color: '#C17B2A' }}>
            {status?.scanCount ?? '—'} completed
          </p>
        </div>
      </div>

      {/* How it works */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">How it works</p>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between gap-2">
            {[
              { icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C17B2A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="2"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6a6 6 0 0 1 6 6"/><path d="M12 10a2 2 0 0 1 2 2"/>
                </svg>
              ), title: 'Scans daily', sub: '8am & 6pm' },
              { icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C17B2A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              ), title: 'Finds cheapest', sub: 'Jetstar & SriLankan Airlines only' },
              { icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C17B2A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              ), title: 'Alerts you', sub: 'Below A$1,100' },
            ].map(({ icon, title, sub }, i, arr) => (
              <div key={title} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(193,123,42,0.1)' }}>
                    {icon}
                  </div>
                  <p className="text-xs font-medium text-gray-800 text-center">{title}</p>
                  <p className="text-xs text-gray-400 text-center">{sub}</p>
                </div>
                {i < arr.length - 1 && (
                  <span className="text-gray-200 text-sm flex-shrink-0">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coverage */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Coverage</p>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {[
            { label: 'Route', value: 'Melbourne → Colombo' },
            { label: 'Fare type', value: 'One-way · Economy' },
            { label: 'Scan schedule', value: '8:00 am & 6:00 pm daily' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-xs text-gray-400">{label}</span>
              <span className="text-xs font-medium text-gray-800">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-xs text-gray-400">Airlines</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: '#FF5A00', color: '#fff' }}>JQ</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: '#003875', color: '#FFD700' }}>UL</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-xs text-gray-400">Alert threshold</span>
            <span className="text-xs font-medium" style={{ color: '#C17B2A' }}>Below A$1,100</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-xs text-gray-400">Windows tracked</span>
            <span className="text-xs font-medium text-gray-800">Dec–Jan · Apr</span>
          </div>
        </div>
      </div>

      {/* What's a good fare */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(193,123,42,0.06)', border: '0.5px solid rgba(193,123,42,0.2)' }}>
        <p className="text-xs font-medium mb-1.5" style={{ color: '#C17B2A' }}>💡 What's a good fare?</p>
        <div className="space-y-1">
          {[
            { range: 'Under A$1,000', label: 'Excellent — book it' },
            { range: 'A$1,000 – A$1,100', label: 'Good value' },
            { range: 'Above A$1,100', label: 'Keep watching' },
          ].map(({ range, label }) => (
            <div key={range} className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: '#7a5020' }}>{range}</span>
              <span className="text-xs" style={{ color: '#a0784a' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stack info — admin only */}
      {isAdmin && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Stack</p>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {[
              { label: 'Frontend', value: 'React + Vite · Vercel' },
              { label: 'Backend', value: 'Node.js + Express · Railway' },
              { label: 'Database', value: 'Supabase (PostgreSQL)' },
              { label: 'Flight data', value: 'RapidAPI · Flights Sky Scraper' },
              { label: 'Alerts', value: 'Callmebot WhatsApp' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs font-medium text-gray-800">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer + built by */}
      <div className="pb-4 space-y-1.5">
        <p className="text-center text-xs text-gray-400">
          Fares are indicative only. Always confirm pricing on Skyscanner or the airline's website before booking.
        </p>
        <p className="text-center text-xs text-gray-300">Built by Chat · Melbourne, Australia</p>
      </div>

    </div>
  );
}

// ── Bottom Nav ─────────────────────────────────────────────────────────────────
function BottomNav({ activePage, setActivePage }) {
  const items = [
    { id: 'flights', label: 'Flights', icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#C17B2A' : '#bbb'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2l4.4 4.4-1.8 5.4 5-1.8 4.4 4.4z"/>
      </svg>
    )},
    { id: 'windows', label: 'Windows', icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#C17B2A' : '#bbb'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    )},
    { id: 'alerts', label: 'Alerts', icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#C17B2A' : '#bbb'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    )},
    { id: 'about', label: 'About', icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#C17B2A' : '#bbb'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="8.5"/>
        <line x1="12" y1="11" x2="12" y2="16"/>
      </svg>
    )},
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex md:hidden z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {items.map(({ id, label, icon }) => {
        const active = activePage === id;
        return (
          <button key={id} onClick={() => setActivePage(id)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-all active:scale-95"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            {icon(active)}
            <span className="text-xs" style={{ color: active ? '#C17B2A' : '#bbb', fontWeight: active ? 500 : 400 }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Top Nav (desktop) ──────────────────────────────────────────────────────────
function TopNav({ activePage, setActivePage }) {
  const items = [
    { id: 'flights', label: 'Flights' },
    { id: 'windows', label: 'Windows' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'about', label: 'About' },
  ];
  return (
    <div className="hidden md:flex items-center gap-1">
      {items.map(({ id, label }) => {
        const active = activePage === id;
        return (
          <button key={id} onClick={() => setActivePage(id)}
            className="text-sm px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: active ? 'rgba(193,123,42,0.1)' : 'transparent',
              color: active ? '#C17B2A' : '#9ca3af',
              fontWeight: active ? 500 : 400,
              border: 'none', cursor: 'pointer',
            }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [activePage, setActivePage]     = useState('flights');
  const [activeWindow, setActiveWindow] = useState(1);
  const [flights, setFlights]           = useState([]);
  const [flights1, setFlights1]         = useState([]);
  const [flights2, setFlights2]         = useState([]);
  const [history, setHistory]           = useState([]);
  const [history1, setHistory1]         = useState([]);
  const [history2, setHistory2]         = useState([]);
  const [alerts, setAlerts]             = useState([]);
  const [status, setStatus]             = useState(null);
  const [loading, setLoading]           = useState(true);
  const [scraping, setScraping]         = useState(false);
  const [scanStep, setScanStep]         = useState(0);
  const [windowMeta, setWindowMeta]     = useState(null);
  const [windows, setWindows]           = useState(WINDOWS);
  const activeWindowRef = useRef(activeWindow);

  useEffect(() => { activeWindowRef.current = activeWindow; }, [activeWindow]);

  const fetchData = useCallback(async (windowId) => {
    setLoading(true);
    try {
      const [flightsRes, historyRes, alertsRes, statusRes, flights1Res, history1Res, flights2Res, history2Res] = await Promise.all([
        fetch(`${API}/api/flights/latest?window=${windowId}`),
        fetch(`${API}/api/history?window=${windowId}`),
        fetch(`${API}/api/alerts`),
        fetch(`${API}/api/status`),
        fetch(`${API}/api/flights/latest?window=1`),
        fetch(`${API}/api/history?window=1`),
        fetch(`${API}/api/flights/latest?window=2`),
        fetch(`${API}/api/history?window=2`),
      ]);
      setFlights(await flightsRes.json());
      setHistory(await historyRes.json());
      setAlerts(await alertsRes.json());
      setFlights1(await flights1Res.json());
      setHistory1(await history1Res.json());
      setFlights2(await flights2Res.json());
      setHistory2(await history2Res.json());
      const s = await statusRes.json();
      setStatus(s);
      const win = s.windows?.find(w => w.id === windowId);
      setWindowMeta(win ?? null);
      if (s.windows) {
        setWindows(WINDOWS.map(w => {
          const meta = s.windows.find(sw => sw.id === w.id);
          return meta ? { ...w, startDate: meta.startDate } : w;
        }));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(activeWindow); }, [activeWindow, fetchData]);

  useEffect(() => {
    const socket = io(API, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socket.on('connect', () => console.log('[Socket] Connected'));
    socket.on('status', (data) => {
      setScraping(data.isRunning);
      if (data.scanStep !== undefined) setScanStep(data.scanStep);
      if (data.scanStep === 'done') {
        setScanStep(0);
        fetchData(activeWindowRef.current);
      }
    });
    socket.on('disconnect', () => console.log('[Socket] Disconnected'));
    return () => socket.disconnect();
  }, [fetchData]);

  const handleScrape = async () => {
    try {
      await fetch(`${API}/api/scrape`, { method: 'POST' });
    } catch (err) {
      console.error('Scrape error:', err);
    }
  };

  const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';
  const cheapest = flights.length > 0 ? Math.round(Math.min(...flights.map(f => f.price_aud))) : null;
  const activeWin = windows.find(w => w.id === activeWindow);

  return (
    <>
      <RadarOverlay scraping={scraping} scanStep={scanStep} />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            {/* Logo + wordmark */}
            <button className="flex items-center gap-3" onClick={() => setActivePage('flights')}
  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"
                  style={{ position: 'absolute', top: 0, left: 0 }}>
                  <circle cx="26" cy="26" r="18"
                    stroke="#C17B2A" strokeWidth="1.5" fill="none"
                    strokeDasharray="113" strokeDashoffset="113"
                    style={{ animation: 'ringDraw 1s cubic-bezier(0.4,0,0.2,1) 0.1s forwards' }} />
                  <path d="M37 9 Q46 3 52 7 Q47 11 42 16 Q39 13 37 9Z" fill="#C17B2A"
                    style={{ opacity: 0, animation: 'wingIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.9s forwards, wingPulse 4s ease-in-out 2.5s infinite' }} />
                  <path d="M39 16 Q45 12 52 15 Q47 18 43 21 Q41 19 39 16Z" fill="#C17B2A"
                    style={{ opacity: 0, animation: 'wingIn2 0.6s cubic-bezier(0.34,1.56,0.64,1) 1.05s forwards' }} />
                </svg>
                <span style={{
                  position: 'absolute', fontSize: 22, lineHeight: 1, zIndex: 1,
                  top: '50%', left: '50%', opacity: 0,
                  transform: 'translate(-50%,-50%)',
                  animation: 'foxIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.4s forwards',
                }}>🦊</span>
              </div>
              <div>
                <div className="leading-none">
                  <span className="text-xl font-medium" style={{ letterSpacing: '-0.03em', color: '#111' }}>Fare</span>
                  <span className="text-xl font-medium" style={{ letterSpacing: '-0.03em', color: '#C17B2A' }}>fox</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Your family's flight radar</div>
              </div>
            </button>

            {/* Desktop nav + right side */}
            <div className="flex items-center gap-4">
              <TopNav activePage={activePage} setActivePage={setActivePage} />
              <span className="text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full hidden sm:block">
                MEL → CMB
              </span>
              {status && isAdmin && (
                <span className="text-xs text-gray-400 hidden sm:block">
                  {scraping
                    ? 'Scanning MEL → CMB…'
                    : status.lastRun
                      ? `Last scan ${new Date(status.lastRun).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}`
                      : 'Never scanned'}
                </span>
              )}
              {isAdmin && (
                <button onClick={handleScrape} disabled={scraping}
                  className="text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={scraping
                    ? { background: 'rgba(193,123,42,0.12)', color: '#C17B2A', border: '1px solid rgba(193,123,42,0.3)' }
                    : { background: '#C17B2A', color: '#fff', border: 'none' }}>
                  {scraping ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: 'rgba(193,123,42,0.3)', borderTopColor: '#C17B2A' }} />
                      Scanning…
                    </span>
                  ) : 'Scan Now'}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="pb-20 md:pb-0">
          {activePage === 'flights' && (
            <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
              {alerts.length > 0 && <AlertBanner alerts={alerts} />}
              <HeroStat price={cheapest} window={activeWin} windowMeta={windowMeta} loading={loading} history={history} />
              <DateWindowTabs windows={windows} active={activeWindow} onChange={setActiveWindow} />
              <PriceChart history={history} loading={loading} />
              <FlightsList flights={flights} loading={loading} />
              <p className="text-center text-xs text-gray-300 pb-4">
                Checks daily at 08:00 & 18:00 · Jetstar & SriLankan Airlines · Alert below A$1,100 · One way fares only
              </p>
            </main>
          )}
          {activePage === 'windows' && (
            <WindowsPage windows={windows} flights1={flights1} flights2={flights2}
              history1={history1} history2={history2} status={status} />
          )}
          {activePage === 'alerts' && <AlertsPage />}
          {activePage === 'about' && <AboutPage status={status} isAdmin={isAdmin} />}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav activePage={activePage} setActivePage={setActivePage} />
    </>
  );
}
