const cron = require('node-cron');
const { scrapeWindow } = require('./scraper');
const { getWindow1, getWindow2 } = require('./dateWindows');
const { appendFlights } = require('./db');
const { sendWhatsAppAlert } = require('./alerts');

let lastRun = null;
let lastStatus = 'never';
let isRunning = false;
let io = null;

function setSocketServer(socketServer) {
  io = socketServer;
}

function emitStatus(extra = {}) {
  if (io) io.emit('status', { lastRun, lastStatus, isRunning, ...extra });
}

async function runScrape() {
  if (isRunning) {
    console.log('[Scheduler] Scrape already in progress, skipping.');
    return;
  }
  isRunning = true;
  lastStatus = 'running';
  emitStatus({ scanStep: 0 }); // notify all clients — scan started
  console.log('[Scheduler] Starting scrape...');

  try {
    const w1 = getWindow1();
    const w2 = getWindow2();

    // Window 1
    const flights1 = await scrapeWindow(w1);
    emitStatus({ scanStep: 1 }); // window 1 done

    // Window 2
    const flights2 = await scrapeWindow(w2);
    emitStatus({ scanStep: 2 }); // window 2 done

    const allFlights = [...flights1, ...flights2];
    if (allFlights.length > 0) appendFlights(allFlights);

    const threshold = parseFloat(process.env.PRICE_ALERT_THRESHOLD ?? 1100);
    const alertFlights = allFlights
      .filter(f => f.price_aud > 0 && f.price_aud < threshold)
      .sort((a, b) => a.price_aud - b.price_aud);

    if (alertFlights.length > 0) {
      const f = alertFlights[0];
      const dur = `${Math.floor(f.duration_mins / 60)}h ${f.duration_mins % 60}m`;
      const bookUrl = f.airline.toLowerCase().includes('jetstar')
        ? `https://www.jetstar.com/au/en/flights/results?from=MEL&to=CMB&departDate=${f.departure_date}&adults=1&children=0&infants=0&cabin=Y`
        : f.airline.toLowerCase().includes('sri')
        ? `https://www.srilankan.com/en_uk/fly-with-us/book-a-flight?from=MEL&to=CMB&departDate=${f.departure_date}&adults=1`
        : `https://www.google.com/travel/flights?q=flights+from+MEL+to+CMB+on+${f.departure_date}`;
      const msg = `Farefox: ${f.airline} MEL->CMB on ${f.departure_date} for AUD ${f.price_aud.toFixed(0)}. ${f.stops} stop(s), ${dur}. Book: ${bookUrl}`;
      await sendWhatsAppAlert(msg);
    }

    lastRun = new Date().toISOString();
    lastStatus = `ok — ${allFlights.length} target flights found`;
    console.log('[Scheduler]', lastStatus);
  } catch (err) {
    lastStatus = `error: ${err.message}`;
    console.error('[Scheduler] Scrape failed:', err.message);
  } finally {
    isRunning = false;
    emitStatus({ scanStep: 'done' }); // notify all clients — scan complete
  }
}

function startScheduler() {
  cron.schedule('0 8 * * *', () => {
    console.log('[Scheduler] Cron fired — 08:00 Melbourne daily scrape');
    runScrape();
  }, { timezone: 'Australia/Melbourne' });
  console.log('[Scheduler] Daily scrape scheduled at 08:00 Australia/Melbourne');
}

function getStatus() {
  return { lastRun, lastStatus, isRunning };
}

module.exports = { startScheduler, runScrape, getStatus, setSocketServer };
