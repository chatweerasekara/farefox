const cron = require('node-cron');
const { scrapeWindow } = require('./scraper');
const { getWindow1, getWindow2 } = require('./dateWindows');
const { appendFlights } = require('./csv');
const { sendWhatsAppAlert } = require('./alerts');

let lastRun = null;
let lastStatus = 'never';
let isRunning = false;

async function runScrape() {
  if (isRunning) {
    console.log('[Scheduler] Scrape already in progress, skipping.');
    return;
  }
  isRunning = true;
  lastStatus = 'running';
  console.log('[Scheduler] Starting scrape...');

  try {
    const w1 = getWindow1();
    const w2 = getWindow2();

    // Run windows sequentially to avoid API hammering
    const flights1 = await scrapeWindow(w1);
    const flights2 = await scrapeWindow(w2);
    const allFlights = [...flights1, ...flights2];

    if (allFlights.length > 0) appendFlights(allFlights);

    const threshold = parseFloat(process.env.PRICE_ALERT_THRESHOLD ?? 1100);
    const alertFlights = allFlights
      .filter(f => f.price_aud > 0 && f.price_aud < threshold)
      .sort((a, b) => a.price_aud - b.price_aud);

    if (alertFlights.length > 0) {
      const f = alertFlights[0];
      const dur = `${Math.floor(f.duration_mins / 60)}h ${f.duration_mins % 60}m`;
      const msg = `Farefox: ${f.airline} MEL→CMB on ${f.departure_date} for A$${f.price_aud.toFixed(0)}. ${f.stops} stop(s), ${dur}. Book now!`;
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
  }
}

function startScheduler() {
  // Daily at 08:00 local time
  cron.schedule('0 8 * * *', () => {
    console.log('[Scheduler] Cron fired — 08:00 Melbourne daily scrape');
    runScrape();
  }, { timezone: 'Australia/Melbourne' });
  console.log('[Scheduler] Daily scrape scheduled at 08:00 Australia/Melbourne');
}

function getStatus() {
  return { lastRun, lastStatus, isRunning };
}

module.exports = { startScheduler, runScrape, getStatus };
