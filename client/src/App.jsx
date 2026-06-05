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

function RadarOverlay({ scraping, scanStep }) {
  const statusItems = [
    { label: 'Christmas & New Year window', done: scanStep >= 1 },
    { label: 'Sri Lankan New Year window', done: scanStep >= 2 },
    { label: 'Checking alerts', done: scanStep === 'done' },
  ];

  if (!scraping) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 99999,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#0a0a0a',
        border: '0.5px solid #1a1a1a',
        borderRadius: 20,
        padding: '40px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        width: '100%',
        maxWidth: 360,
        margin: '0 16px',
      }}>
        {/* Radar */}
        <div style={{position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute', width: 120, height: 120,
              borderRadius: '50%', border: '1px solid #C17B2A',
              animation: `radarExpand 2s ease-out ${i * 0.65}s infinite`,
            }}/>
          ))}
          <div style={{
            position: 'absolute', width: 60, height: 60, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 70%, rgba(193,123,42,0.45) 100%)',
            animation: 'radarSweep 2s linear infinite',
          }}/>
          <div style={{
            position: 'absolute', width: 60, height: 60, borderRadius: '50%',
            background: 'rgba(193,123,42,0.08)', border: '1.5px solid rgba(193,123,42,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>🦊</div>
          {[
            {top: '16%', right: '14%', delay: '0.3s'},
            {bottom: '18%', left: '14%', delay: '0.9s'},
            {top: '52%', left: '10%', delay: '1.5s'},
          ].map((b, i) => (
            <div key={i} style={{
              position: 'absolute', width: 5, height: 5, borderRadius: '50%',
              background: '#C17B2A',
              top: b.top, right: b.right, bottom: b.bottom, left: b.left,
              animation: `blipPulse 2s ease-in-out ${b.delay} infinite`,
            }}/>
          ))}
        </div>

        {/* Text */}
        <div style={{textAlign: 'center'}}>
          <p style={{color: '#fff', fontWeight: 500, fontSize: 15}}>Scanning for fares…</p>
          <p style={{color: '#C17B2A', fontWeight: 500, fontSize: 13, marginTop: 6}}>MEL → CMB</p>
          <p style={{color: '#555', fontSize: 12, marginTop: 4}}>Checking Jetstar & SriLankan Airlines</p>
        </div>

        {/* Progress bar */}
        <div style={{width: '100%', height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden'}}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: 'linear-gradient(90deg,#C17B2A,#E8973A)',
            animation: 'progressScan 24s ease-in-out forwards',
          }}/>
        </div>

        {/* Status list */}
        <div style={{width: '100%', display: 'flex', flexDirection: 'column', gap: 8}}>
          {statusItems.map((item, i) => {
            const isActive = !item.done && (
              (i === 0 && scanStep === 0) ||
              (i === 1 && scanStep === 1) ||
              (i === 2 && scanStep === 2)
            );
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: item.done ? '#22c55e' : (isActive ? '#C17B2A' : '#333'),
                  animation: isActive ? 'activePulse 1s ease-in-out infinite' : 'none',
                }}/>
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

export default function App() {
  const [activeWindow, setActiveWindow] = useState(1);
  const [flights, setFlights]           = useState([]);
  const [history, setHistory]           = useState([]);
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

  // WebSocket connection
  useEffect(() => {
    const socket = io(API, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('[Socket] Connected');
    });

    socket.on('status', (data) => {
      setScraping(data.isRunning);
      if (data.scanStep !== undefined) setScanStep(data.scanStep);
      // When scan completes, refresh data for all users
      if (data.scanStep === 'done') {
        setScanStep(0);
        fetchData(activeWindowRef.current);
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    return () => socket.disconnect();
  }, [fetchData]);

  const handleScrape = async () => {
    try {
      await fetch(`${API}/api/scrape`, { method: 'POST' });
      // scraping state now driven by socket events
    } catch (err) {
      console.error('Scrape error:', err);
    }
  };

  const heroPrice = flights.length > 0 ? Math.min(...flights.map(f => f.price_aud)) : null;
  const activeWin = windows.find(w => w.id === activeWindow);

  return (
    <>
      <RadarOverlay scraping={scraping} scanStep={scanStep} />

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">

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
                disabled={scraping}
                className="text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={scraping
                  ? {background: 'rgba(193,123,42,0.12)', color: '#C17B2A', border: '1px solid rgba(193,123,42,0.3)'}
                  : {background: '#C17B2A', color: '#fff', border: 'none'}}
              >
                {scraping ? (
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
    </>
  );
}
