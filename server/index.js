require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { startScheduler, runScrape, getStatus, setSocketServer } = require('./scheduler');
const { readFlights, getScanCount, addSubscriber, removeSubscriber } = require('./db');
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

setSocketServer(io);

app.use(cors({
  origin: ['https://farefox-seven.vercel.app', 'http://localhost:5173']
}));
app.use(express.json());

io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);
  socket.emit('status', getStatus());
  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});

// GET /api/status
app.get('/api/status', async (_req, res) => {
  const scanCount = await getScanCount();
  res.json({
    ...getStatus(),
    scanCount,
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
      const d = new Date(f.timestamp).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
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

// POST /api/subscribe
app.post('/api/subscribe', async (req, res) => {
  const { email, threshold, window_1, window_2 } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  try {
    const subscriber = await addSubscriber({
      email: email.toLowerCase().trim(),
      threshold: parseInt(threshold) || 1100,
      window_1: window_1 !== false,
      window_2: window_2 !== false,
    });
    res.json({ success: true, subscriber });
  } catch (err) {
    console.error('[API] subscribe error:', err.message);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// GET /api/unsubscribe?email=xxx
app.get("/api/unsubscribe", async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).send(unsubscribePage("Invalid unsubscribe link."));
  }
  try {
    await removeSubscriber(email);
    res.send(unsubscribePage(`${email} has been unsubscribed from Farefox alerts.`));
  } catch (err) {
    console.error("[API] unsubscribe error:", err.message);
    res.status(500).send(unsubscribePage("Something went wrong. Please try again."));
  }
});

function unsubscribePage(message) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:40px;font-family:-apple-system,sans-serif;background:#f9f9f7;display:flex;align-items:center;justify-content:center;min-height:100vh;box-sizing:border-box;"><div style="background:#fff;border-radius:16px;border:1px solid #e5e5e3;padding:40px;max-width:400px;width:100%;text-align:center;"><div style="font-size:22px;font-weight:500;letter-spacing:-0.03em;margin-bottom:8px;"><span style="color:#111;">Fare</span><span style="color:#C17B2A;">fox</span></div><p style="font-size:14px;color:#555;margin:16px 0;">${message}</p><a href="https://farefox-seven.vercel.app" style="font-size:13px;color:#C17B2A;text-decoration:none;">Back to Farefox →</a></div></body></html>`;
}

// POST /api/scrape
app.post('/api/scrape', (_req, res) => {
  res.json({ message: 'Scrape started' });
  runScrape();
});

server.listen(PORT, () => {
  console.log(`[Server] Farefox running on http://localhost:${PORT}`);
  startScheduler();
});
