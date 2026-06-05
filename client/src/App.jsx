import { useState, useEffect, useCallback } from 'react';
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

// ── Radar scanning overlay ──────────────────────────────────────────────────
function RadarOverlay({ scraping }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!scraping) { setStep(0); return; }
    const steps = [0, 1, 2];
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % steps.length;
      setStep(i);
    }, 6000);
    return () => clearInterval(t);
  }, [scraping]);

  if (!scraping) return null;

  const statusItems = [
    { label: 'Christmas & New Year window', done: step >= 1 },
    { label: 'Sri Lankan New Year window', done: step >= 2 },
    { label: 'Checking alerts', done: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'}}>
      <div className="rounded-2xl px-10 py-10 flex flex-col items-center gap-6 w-full max-w-sm mx-4"
        style={{background: '#0a0a0a', border: '0.5px solid #1a1a1a'}}>

        {/* Radar */}
        <div className="relative flex items-center justify-center" style={{width: 120, height: 120}}>
          {/* Expanding rings */}
          {[0, 1, 2].map(i => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: 120, height: 120,
                border: '1px solid #C17B2A',
                animation: `radarExpand 2s ease-out ${i * 0.65}s infinite`,
              }}/>
          ))}
          {/* Sweep */}
          <div className="absolute rounded-full"
            style={{
              width: 60, height: 60,
              background: 'conic-gradient(from 0deg, transparent 70%, rgba(193,123,42,0.45) 100%)',
              animation: 'radarSweep 2s linear infinite',
            }}/>
          {/* Core */}
          <div className="absolute rounded-full flex items-center justify-center"
            style={{width: 60, height: 60, background: 'rgba(193,123,42,0.08)', border: '1.5px solid rgba(193,123,42,0.35)'}}>
            <span style={{fontSize: 24}}>🦊</span>
          </div>
          {/* Blips */}
          {[
            {top: '16%', right: '14%', delay: '0.3s'},
            {bottom: '18%', left: '14%', delay: '0.9s'},
            {top: '52%', left: '10%', delay: '1.5s'},
          ].map((b, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: 5, height: 5, background: '#C17B2A',
                top: b.top, right: b.right, bottom: b.bottom, left: b.left,
                animation: `blipPulse 2s ease-in-out ${b.delay} infinite`,
              }}/>
          ))}
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-white font-medium" style={{fontSize: 15}}>
            Scanning for fares
            <span style={{animation: 'dots 1.5s steps(4,end) infinite', display: 'inline-block', width: 20}}/>
          </p>
          <p className="mt-1 font-medium" style={{fontSize: 13, color: '#C17B2A'}}>MEL → CMB</p>
          <p className="mt-1" style={{fontSize: 12, color: '#555'}}>Checking Jetstar & SriLankan Airlines</p>
        </div>

        {/* Progress bar */}
        <div className="w-full rounded-full overflow-hidden" style={{height: 3, background: 'rgba(255,255,255,0.06)'}}>
          <div className="h-full rounded-full"
            style={{background: 'linear-gradient(90deg,#C17B2A,#E8973A)', animation: 'progressScan 24s ease-in-out forwards'}}/>
        </div>

        {/* Status list */}
        <div className="w-full flex flex-col gap-2">
          {statusItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="rounded-full flex-shrink-0"
                style={{
                  width: 6, height: 6,
                  background: item.done ? '#22c55e' : (i === step ? '#C17B2A' : '#333'),
                  animation: !item.done && i === step ? 'activePulse 1s ease-in-out infinite' : 'none',
                }}/>
              <span style={{
                fontSize: 11,
                color: item.done ? '#555' : (i === step ? '#C17B2A' : '#333'),
                fontWeight: i === step && !item.done ? 500 : 400,
              }}>
                {item.label}{item.done ? ' ✓' : (i === step ? '…' : '')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CSS animations injected inline */}
     
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeWindow, setActiveWindow] = useState(1);
  const [flights, setFlights]           = useState([]);
  const [history, setHistory]           = useState([]);
  const [alerts, setAlerts]             = useState([]);
  const [status, setStatus]             = useState(null);
  const [loading, setLoading]           = useState(true);
  const [scraping, setScraping]         = useState(false);
  const [windowMeta, setWindowMeta]     = useState(null);
  const [windows, setWindows]           = useState(WINDOWS);

  const fetchData = useCallback(async (windowId) => {
    setLoading(true);
    try {
      const [flightsRes, historyRes, alertsRes, statusRes] = await Promise.all([
        fetch(`${API}/api/flights/latest?window=${windowId}`),
        fetch(`${API}/api/history?window=${windowId}`),
        fetch(`${API}/api/alerts`),
        fetch(`${API}/api/status`),
      ]);
      setFlights(await flightsRes.json());
      setHistory(await historyRes.json());
      setAlerts(await alertsRes.json());
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

  const handleScrape = async () => {
    setScraping(true);
    try {
      await fetch(`${API}/api/scrape`, { method: 'POST' });
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const res = await fetch(`${API}/api/status`);
        const s   = await res.json();
        setStatus(s);
        if (!s.isRunning || attempts > 60) {
          clearInterval(poll);
          setScraping(false);
          fetchData(activeWindow);
        }
      }, 5000);
    } catch {
      setScraping(false);
    }
  };

  const heroPrice = flights.length > 0 ? Math.min(...flights.map(f => f.price_aud)) : null;
  const activeWin = windows.find(w => w.id === activeWindow);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Radar overlay */}
      <RadarOverlay scraping={scraping} />

      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo — amber ring, animated, fox emoji */}
          <div className="flex items-center gap-3">
            <div style={{position:'relative', width:52, height:52, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"
                style={{position:'absolute', top:0, left:0}}>
                <circle cx="26" cy="26" r="18"
                  stroke="#C17B2A" strokeWidth="1.5" fill="none"
                  strokeDasharray="113" strokeDashoffset="113"
                  style={{animation:'ringDraw 1s cubic-bezier(0.4,0,0.2,1) 0.1s forwards'}}/>
                <path d="M37 9 Q46 3 52 7 Q47 11 42 16 Q39 13 37 9Z" fill="#C17B2A"
                  style={{opacity:0, animation:'wingIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.9s forwards, wingPulse 4s ease-in-out 2.5s infinite'}}/>
                <path d="M39 16 Q45 12 52 15 Q47 18 43 21 Q41 19 39 16Z" fill="#C17B2A"
                  style={{opacity:0, animation:'wingIn2 0.6s cubic-bezier(0.34,1.56,0.64,1) 1.05s forwards'}}/>
              </svg>
              <span style={{
                position:'absolute', fontSize:22, lineHeight:1, zIndex:1,
                top:'50%', left:'50%', opacity:0,
                animation:'foxIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.4s forwards',
              }}>🦊</span>
            </div>
            <div>
              <div className="leading-none">
                <span className="text-xl font-medium" style={{letterSpacing:'-0.03em', color:'#111'}}>Fare</span>
                <span className="text-xl font-medium" style={{letterSpacing:'-0.03em', color:'#C17B2A'}}>fox</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Your family's flight radar</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full hidden sm:block">
              MEL → CMB
            </span>
            {status && (
              <span className="text-xs text-gray-400 hidden sm:block">
                {scraping
                  ? 'Scanning MEL → CMB…'
                  : status.lastRun
                    ? `Last scan ${new Date(status.lastRun).toLocaleString('en-AU', { dateStyle:'short', timeStyle:'short' })}`
                    : 'Never scanned'}
              </span>
            )}
            <button
              onClick={handleScrape}
              disabled={scraping || status?.isRunning}
              className="text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{background: scraping ? 'rgba(193,123,42,0.12)', color: scraping ? '#C17B2A' : '#fff',
                border: scraping ? '1px solid rgba(193,123,42,0.3)' : 'none',
                ...((!scraping) && {background: '#C17B2A'})}}
            >
              {scraping || status?.isRunning ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                    style={{borderColor: 'rgba(193,123,42,0.3)', borderTopColor: '#C17B2A'}}/>
                  Scanning…
                </span>
              ) : 'Scan Now'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {alerts.length > 0 && <AlertBanner alerts={alerts} />}
        <HeroStat price={heroPrice} window={activeWin} windowMeta={windowMeta} loading={loading} history={history} />
        <DateWindowTabs windows={windows} active={activeWindow} onChange={setActiveWindow} />
        <PriceChart history={history} loading={loading} />
        <FlightsList flights={flights} loading={loading} />
        <p className="text-center text-xs text-gray-300 pb-4">
          Checks daily at 08:00 · Jetstar & SriLankan Airlines · Alert below A$1,100 · One way fares only
        </p>
      </main>
    </div>
  );
}
