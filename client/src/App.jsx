import { useState, useEffect, useCallback } from 'react';
import HeroStat from './components/HeroStat';
import AlertBanner from './components/AlertBanner';
import DateWindowTabs from './components/DateWindowTabs';
import PriceChart from './components/PriceChart';
import FlightsList from './components/FlightsList';

const WINDOWS = [
  { id: 1, label: 'Dec 10 – Jan 20' },
  { id: 2, label: 'Apr 5 – Apr 20' },
];

export default function App() {
  const [activeWindow, setActiveWindow] = useState(1);
  const [flights, setFlights] = useState([]);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);

  const fetchData = useCallback(async (windowId) => {
    setLoading(true);
    try {
      const [flightsRes, historyRes, alertsRes, statusRes] = await Promise.all([
        fetch(`/api/flights/latest?window=${windowId}`),
        fetch(`/api/history?window=${windowId}`),
        fetch('/api/alerts'),
        fetch('/api/status'),
      ]);
      setFlights(await flightsRes.json());
      setHistory(await historyRes.json());
      setAlerts(await alertsRes.json());
      setStatus(await statusRes.json());
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activeWindow);
  }, [activeWindow, fetchData]);

  const handleScrape = async () => {
    setScraping(true);
    try {
      await fetch('/api/scrape', { method: 'POST' });
      // Poll status until scrape completes (max 5 min)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const res = await fetch('/api/status');
        const s = await res.json();
        setStatus(s);
        if (!s.isRunning || attempts > 60) {
          clearInterval(poll);
          setScraping(false);
          fetchData(activeWindow);
        }
      }, 5000);
    } catch (err) {
      setScraping(false);
    }
  };

  const heroPrice = flights.length > 0 ? Math.min(...flights.map(f => f.price_aud)) : null;
  const activeWin = WINDOWS.find(w => w.id === activeWindow);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900 tracking-tight">Farefox</span>
            <span className="text-gray-300 text-lg">·</span>
            <span className="text-sm text-gray-400 font-medium">MEL → CMB</span>
          </div>
          <div className="flex items-center gap-4">
            {status && (
              <span className="text-xs text-gray-400 hidden sm:block">
                {status.lastRun
                  ? `Last scan ${new Date(status.lastRun).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}`
                  : 'Never scanned'}
              </span>
            )}
            <button
              onClick={handleScrape}
              disabled={scraping || status?.isRunning}
              className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {scraping || status?.isRunning ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Scanning…
                </span>
              ) : 'Scan Now'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {alerts.length > 0 && <AlertBanner alerts={alerts} />}

        <HeroStat price={heroPrice} window={activeWin} loading={loading} />

        <DateWindowTabs windows={WINDOWS} active={activeWindow} onChange={setActiveWindow} />

        <PriceChart history={history} loading={loading} />

        <FlightsList flights={flights} loading={loading} />

        <p className="text-center text-xs text-gray-300 pb-4">
          Checks daily at 08:00 · Jetstar & SriLankan Airlines · Alert below A$1,100
        </p>
      </main>
    </div>
  );
}
