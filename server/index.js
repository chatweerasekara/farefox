require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { startScheduler, runScrape, getStatus } = require('./scheduler');
const { readFlights } = require('./db');
const { getWindow1, getWindow2 } = require('./dateWindows');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['https://farefox-seven.vercel.app', 'http://localhost:5173']
}));
app.use(express.json());

// GET /api/status
app.get('/api/status', (_req, res) => {
  res.json({
    ...getStatus(),
    windows: [getWindow1(), getWindow2()].map(w => ({
      id: w.id,
      label: w.label,
      startDate: w.startDate,
      endDate: w.endDate,
    })),
  });
});

// GET /api/flights/latest?window=1|2
app.get('/api/flights/latest', (req, res) => {
  const wid = parseInt(req.query.window) || 1;
  const flights = readFlights(wid);
  if (!flights.length) return res.json([]);

  const latestTs = flights.reduce((max, f) => f.timestamp > max ? f.timestamp : max, '');
  const latestFlights = flights.filter(f => f.timestamp === latestTs);
const seen = new Map();
for (const f of latestFlights) {
  const key = `${f.departure_date}-${f.airline}-${f.departure_time}`;
  if (!seen.has(key)) seen.set(key, f);
}
const latest = [...seen.values()].sort((a, b) => a.price_aud - b.price_aud);
res.json(latest);
});

// GET /api/history?window=1|2
app.get('/api/history', (req, res) => {
  const wid = parseInt(req.query.window) || 1;
  const flights = readFlights(wid);

  const byDate = {};
  for (const f of flights) {
    const d = f.timestamp.split('T')[0];
    if (!(d in byDate) || f.price_aud < byDate[d]) byDate[d] = f.price_aud;
  }

  const history = Object.entries(byDate)
    .map(([date, minPrice]) => ({ date, minPrice }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json(history);
});

// GET /api/alerts  (across both windows, latest scrape only)
app.get('/api/alerts', (_req, res) => {
  const threshold = parseFloat(process.env.PRICE_ALERT_THRESHOLD ?? 1100);
  const flights = [...readFlights(1), ...readFlights(2)];
  if (!flights.length) return res.json([]);

  const latestTs = flights.reduce((max, f) => f.timestamp > max ? f.timestamp : max, '');
  const alerts = flights
    .filter(f => f.timestamp === latestTs && f.price_aud > 0 && f.price_aud < threshold)
    .sort((a, b) => a.price_aud - b.price_aud);

  res.json(alerts);
});

// POST /api/scrape  (manual trigger — responds immediately, runs async)
app.post('/api/scrape', (_req, res) => {
  res.json({ message: 'Scrape started' });
  runScrape();
});

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (_req, res) =>
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'))
  );
}

app.listen(PORT, () => {
  console.log(`[Server] Farefox running on http://localhost:${PORT}`);
  startScheduler();
});
