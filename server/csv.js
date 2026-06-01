const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const HEADER = 'timestamp,window,departure_date,airline,price_aud,stops,duration_mins,departure_time,arrival_time\n';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function csvPath(windowId) {
  return path.join(DATA_DIR, `flights_w${windowId}.csv`);
}

function appendFlights(flights) {
  ensureDataDir();

  const byWindow = {};
  for (const f of flights) {
    (byWindow[f.window] = byWindow[f.window] || []).push(f);
  }

  for (const [wid, rows] of Object.entries(byWindow)) {
    const p = csvPath(wid);
    const lines = rows.map(r =>
      [r.timestamp, r.window, r.departure_date, `"${r.airline}"`,
       r.price_aud, r.stops, r.duration_mins,
       r.departure_time, r.arrival_time].join(',')
    ).join('\n') + '\n';

    if (!fs.existsSync(p)) fs.writeFileSync(p, HEADER + lines);
    else fs.appendFileSync(p, lines);
  }
}

function readFlights(windowId) {
  ensureDataDir();
  const p = csvPath(windowId);
  if (!fs.existsSync(p)) return [];

  return fs.readFileSync(p, 'utf-8')
    .trim()
    .split('\n')
    .slice(1)
    .filter(l => l.trim())
    .map(line => {
      // handle quoted airline names
      const m = line.match(/^([^,]+),(\d),([^,]+),"?([^,"]+)"?,([^,]+),([^,]+),([^,]+),([^,]+),([^,]*)$/);
      if (!m) return null;
      return {
        timestamp: m[1],
        window: parseInt(m[2]),
        departure_date: m[3],
        airline: m[4],
        price_aud: parseFloat(m[5]),
        stops: parseInt(m[6]),
        duration_mins: parseInt(m[7]),
        departure_time: m[8],
        arrival_time: m[9],
      };
    })
    .filter(Boolean);
}

module.exports = { appendFlights, readFlights };
