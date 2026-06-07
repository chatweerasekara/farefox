const cron = require('node-cron');
const { scrapeWindow } = require('./scraper');
const { getWindow1, getWindow2 } = require('./dateWindows');
const { appendFlights, getSubscribers } = require('./db');
const { sendWhatsAppAlert } = require('./alerts');
const { Resend } = require('resend');

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

function buildBookUrl(departure_date) {
  const depDate = departure_date.replace(/-/g, '').slice(2);
  return `https://www.skyscanner.com.au/transport/flights/mel/cmb/${depDate}/?adults=1&cabinclass=economy&rtn=0&currency=AUD`;
}

function buildWindowSection(flights, windowLabel) {
  const rows = flights.slice(0, 5).map(f => {
    const dur = `${Math.floor(f.duration_mins / 60)}h ${f.duration_mins % 60}m`;
    const bookUrl = buildBookUrl(f.departure_date);
    return `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid #f0f0ee; font-size:13px; color:#111;">${f.departure_date}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #f0f0ee; font-size:13px; color:#111;">${f.airline}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #f0f0ee; font-size:13px; font-weight:600; color:#C17B2A;">A$${f.price_aud.toFixed(0)}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #f0f0ee; font-size:13px; color:#666;">${f.stops} stop · ${dur}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #f0f0ee;">
          <a href="${bookUrl}" style="font-size:12px; color:#C17B2A; text-decoration:none; font-weight:500;">Book →</a>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="padding:20px 28px 0;">
      <p style="margin:0 0 12px; font-size:12px; font-weight:600; color:#C17B2A; text-transform:uppercase; letter-spacing:0.05em;">${windowLabel}</p>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px 12px; font-size:11px; font-weight:500; color:#aaa; text-transform:uppercase; letter-spacing:0.05em;">Date</th>
            <th style="text-align:left; padding:8px 12px; font-size:11px; font-weight:500; color:#aaa; text-transform:uppercase; letter-spacing:0.05em;">Airline</th>
            <th style="text-align:left; padding:8px 12px; font-size:11px; font-weight:500; color:#aaa; text-transform:uppercase; letter-spacing:0.05em;">Price</th>
            <th style="text-align:left; padding:8px 12px; font-size:11px; font-weight:500; color:#aaa; text-transform:uppercase; letter-spacing:0.05em;">Details</th>
            <th style="padding:8px 12px;"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function buildEmailHtml({ sections, threshold, email }) {
  const unsubUrl = `https://farefox-production.up.railway.app/api/unsubscribe?email=${encodeURIComponent(email)}`;
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; background:#f9f9f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:560px; margin:32px auto; background:#fff; border-radius:16px; border:1px solid #e5e5e3; overflow:hidden;">

        <!-- Header -->
        <div style="background:#0a0a0a; padding:24px 28px;">
          <span style="font-size:22px; font-weight:500; letter-spacing:-0.03em; color:#fff;">Fare</span>
          <span style="font-size:22px; font-weight:500; letter-spacing:-0.03em; color:#C17B2A;">fox</span>
          <p style="margin:4px 0 0; font-size:12px; color:#666;">Your family's flight radar</p>
        </div>

        <!-- Alert banner -->
        <div style="background:rgba(193,123,42,0.08); border-bottom:1px solid rgba(193,123,42,0.15); padding:16px 28px;">
          <p style="margin:0; font-size:13px; font-weight:600; color:#C17B2A;">🔔 Fares below A$${threshold} found</p>
          <p style="margin:4px 0 0; font-size:12px; color:#888;">MEL → CMB</p>
        </div>

        <!-- Window sections -->
        ${sections.join('<div style="height:1px; background:#f0f0ee; margin:16px 28px;"></div>')}
        <div style="height:20px;"></div>

        <!-- Footer -->
        <div style="padding:16px 28px; border-top:1px solid #f0f0ee; background:#fafaf8;">
          <p style="margin:0; font-size:11px; color:#aaa;">
            Fares are indicative only. Always confirm on Skyscanner or the airline's website before booking.
          </p>
          <p style="margin:6px 0 0; font-size:11px; color:#ccc;">
            You're receiving this because you subscribed to Farefox alerts. &nbsp;
            <a href="${unsubUrl}" style="color:#C17B2A; text-decoration:none;">Unsubscribe</a>
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}

async function sendEmailAlerts(allFlights) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const threshold = parseFloat(process.env.PRICE_ALERT_THRESHOLD ?? 1100);
  const subscribers = await getSubscribers();
  if (!subscribers.length) return;

  const windows = [
    { id: 1, key: 'window_1', label: 'Christmas & New Year' },
    { id: 2, key: 'window_2', label: 'Sri Lankan New Year' },
  ];

  for (const subscriber of subscribers) {
    const subThreshold = subscriber.threshold ?? threshold;
    const sections = [];

    for (const win of windows) {
      if (!subscriber[win.key]) continue;
      const flights = allFlights
        .filter(f => f.window === win.id && f.price_aud > 0 && f.price_aud < subThreshold)
        .sort((a, b) => a.price_aud - b.price_aud);
      if (!flights.length) continue;
      sections.push(buildWindowSection(flights, win.label));
    }

    if (!sections.length) continue;

    try {
      await resend.emails.send({
        from: 'Farefox <onboarding@resend.dev>',
        to: subscriber.email,
        subject: `🦊 MEL→CMB fares below A$${subThreshold}`,
        html: buildEmailHtml({ sections, threshold: subThreshold, email: subscriber.email }),
      });
      console.log(`[Email] Sent alert to ${subscriber.email}`);
    } catch (err) {
      console.error(`[Email] Failed to send to ${subscriber.email}:`, err.message);
    }
  }
}

async function runScrape() {
  if (isRunning) {
    console.log('[Scheduler] Scrape already in progress, skipping.');
    return;
  }
  isRunning = true;
  lastStatus = 'running';
  emitStatus({ scanStep: 0 });
  console.log('[Scheduler] Starting scrape...');
  try {
    const w1 = getWindow1();
    const w2 = getWindow2();

    const flights1 = await scrapeWindow(w1);
    emitStatus({ scanStep: 1 });

    const flights2 = await scrapeWindow(w2);
    emitStatus({ scanStep: 2 });

    const allFlights = [...flights1, ...flights2];
    if (allFlights.length > 0) appendFlights(allFlights);

    // WhatsApp alert
    const threshold = parseFloat(process.env.PRICE_ALERT_THRESHOLD ?? 1100);
    const msgParts = [];
    const windows = [
      { id: 1, label: 'Xmas/NY', flights: flights1 },
      { id: 2, label: 'SL New Year', flights: flights2 },
    ];
    for (const win of windows) {
      const best = win.flights
        .filter(f => f.price_aud > 0 && f.price_aud < threshold)
        .sort((a, b) => a.price_aud - b.price_aud)[0];
      if (best) {
        const dur = `${Math.floor(best.duration_mins / 60)}h ${best.duration_mins % 60}m`;
        const bookUrl = buildBookUrl(best.departure_date);
        msgParts.push(`${win.label}: ${best.airline} ${best.departure_date} AUD${best.price_aud.toFixed(0)} ${dur} Book: ${bookUrl}`);
      }
    }
    if (msgParts.length > 0) {
      await sendWhatsAppAlert(`Farefox MEL->CMB\n${msgParts.join('\n')}`);
    }

    // Email alerts (new)
    await sendEmailAlerts(allFlights);

    lastRun = new Date().toISOString();
    lastStatus = `ok — ${allFlights.length} target flights found`;
    console.log('[Scheduler]', lastStatus);
  } catch (err) {
    lastStatus = `error: ${err.message}`;
    console.error('[Scheduler] Scrape failed:', err.message);
  } finally {
    isRunning = false;
    emitStatus({ scanStep: 'done' });
  }
}

function startScheduler() {
  cron.schedule('0 8,18 * * *', () => {
    console.log('[Scheduler] Cron fired — 08:00/18:00 Melbourne daily scrape');
    runScrape();
  }, { timezone: 'Australia/Melbourne' });
  console.log('[Scheduler] Daily scrape scheduled at 08:00 & 18:00 Australia/Melbourne');
}

function getStatus() {
  return { lastRun, lastStatus, isRunning };
}

module.exports = { startScheduler, runScrape, getStatus, setSocketServer };
