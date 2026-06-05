require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { startScheduler, runScrape, getStatus, setSocketServer } = require('./scheduler');
const { readFlights } = require('./db');
const { getWindow1, getWindow2 } = require('./dateWindows');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://farefox-seven.vercel.app', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
  }
});

const PORT = process.env.PORT || 3001;

// Pass socket server to scheduler so it can emit events
setSocketServer(io);

app.use(cors({
  origin: ['https://farefox-seven.vercel.app', 'http://localhost:5173']
}));
app.use(express.json());

io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);
  // Send current status immediately on connect
  socket.emit('status', getStatus());
  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});

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
app.get('/api/flights/latest', async (req, res) => {
  try {
    const wid = parseInt(req.query.window) || 1;
    const flights = await readFlights(wid);
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
  } catch (err) {
    console.error('[API] flights/latest error:', err.message);
    res.json([]);
  }
});

// GET /api/history?window=1|2
app.get('/api/history', async (req, res) => {
  try {
    const wid = parseInt(req.query.window) || 1;
    const flights = await readFlights(wid);
    const byDate = {};
    for (const f of flights) {
      const d = f.timestamp.split('T')[0];
      if (!(d in byDate) || f.price_aud < byDate[d]) byDate[d] = f.price_aud;
    }
    const history = Object.entries(byDate)
      .map(([date, minPrice]) => ({ date, minPrice }))
      .sort((a, b) => a.date.localeCompare(b.date));
    res.json(history);
  } catch (err) {
    console.error('[API] history error:', err.message);
    res.json([]);
  }
});

// GET /api/alerts
app.get('/api/alerts', async (_req, res) => {
  try {
    const threshold = parseFloat(process.env.PRICE_ALERT_THRESHOLD ?? 1100);
    const [f1, f2] = await Promise.all([readFlights(1), readFlights(2)]);
    const flights = [...f1, ...f2];
    if (!flights.length) return res.json([]);
    const latestTs = flights.reduce((max, f) => f.timestamp > max ? f.timestamp : max, '');
    const alerts = flights
      .filter(f => f.timestamp === latestTs && f.price_aud > 0 && f.price_aud < threshold)
      .sort((a, b) => a.price_aud - b.price_aud);
    res.json(alerts);
  } catch (err) {
    console.error('[API] alerts error:', err.message);
    res.json([]);
  }
});

// POST /api/scrape
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

server.listen(PORT, () => {
  console.log(`[Server] Farefox running on http://localhost:${PORT}`);
  startScheduler();
});
