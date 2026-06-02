const axios = require('axios');

const HOST = 'flights-sky.p.rapidapi.com';
const TARGET_AIRLINES = ['jetstar', 'srilankan', 'sri lankan airlines'];

async function getPriceCalendar(yearMonth) {
  const { data } = await axios.get(`https://${HOST}/flights/price-calendar`, {
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': HOST,
    },
    params: {
      fromEntityId: 'MEL',
      toEntityId: 'CMB',
      yearMonth,         // e.g. "2026-12"
      currency: 'AUD',
      market: 'AU',
      countryCode: 'AU',
    },
    timeout: 20000,
  });
  return data;
}

async function searchFlightsForDate(date) {
  const { data } = await axios.get(`https://${HOST}/flights/search-one-way`, {
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': HOST,
    },
    params: {
      fromEntityId: 'MEL',
      toEntityId: 'CMB',
      departDate: date,
      adults: '1',
      currency: 'AUD',
      market: 'AU',
      countryCode: 'AU',
    },
    timeout: 20000,
  });
  return data;
}

function extractTargetFlights(apiData, date, windowId) {
  const itineraries = apiData?.data?.itineraries ?? [];
  const timestamp = new Date().toISOString();
  return itineraries
    .filter(it => {
      const leg = it.legs?.[0];
      const airline = (leg?.carriers?.marketing?.[0]?.name ?? '').toLowerCase();
      return TARGET_AIRLINES.some(t => airline.includes(t));
    })
    .map(it => {
      const leg = it.legs[0];
      return {
        timestamp,
        window: windowId,
        departure_date: date,
        airline: leg.carriers.marketing[0].name,
        price_aud: it.price?.raw ?? 0,
        stops: leg.stopCount ?? 0,
        duration_mins: leg.durationInMinutes ?? 0,
        departure_time: leg.departure ?? '',
        arrival_time: leg.arrival ?? '',
      };
    });
}

// Get unique YYYY-MM months covered by a window
function getMonthsInWindow(startDate, endDate) {
  const months = new Set();
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    months.add(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setMonth(cur.getMonth() + 1);
    cur.setDate(1);
  }
  return [...months];
}

// Extract cheapest dates from price calendar response within our date range
function extractCheapestDatesFromCalendar(calendarData, startDate, endDate) {
  const days = calendarData?.data?.days ?? [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  return days
    .filter(d => {
      const date = new Date(d.date);
      return date >= start && date <= end && d.price > 0;
    })
    .sort((a, b) => a.price - b.price)
    .slice(0, 3) // only scrape the 3 cheapest dates per window
    .map(d => d.date);
}

async function scrapeWindow(window) {
  console.log(`[Scraper] Window ${window.id} "${window.label}" — calendar mode`);
  const results = [];

  try {
    // Step 1: Get price calendar for each month in the window (1-2 requests)
    const months = getMonthsInWindow(window.startDate, window.endDate);
    console.log(`[Scraper] Fetching calendar for months: ${months.join(', ')}`);

    let cheapestDates = [];
    for (const yearMonth of months) {
      const calData = await getPriceCalendar(yearMonth);
      const dates = extractCheapestDatesFromCalendar(calData, window.startDate, window.endDate);
      cheapestDates.push(...dates);
      await new Promise(r => setTimeout(r, 1000)); // small delay between months
    }

    // Dedupe and take top 3 cheapest overall
    cheapestDates = [...new Set(cheapestDates)].slice(0, 3);
    console.log(`[Scraper] Cheapest dates to drill into: ${cheapestDates.join(', ')}`);

    // Step 2: Full search only for the cheapest dates (1-3 requests)
    for (const date of cheapestDates) {
      console.log(`[Scraper]   → ${date}`);
      const data = await searchFlightsForDate(date);
      const flights = extractTargetFlights(data, date, window.id);
      results.push(...flights);
      await new Promise(r => setTimeout(r, 1200));
    }

    console.log(`[Scraper] Window ${window.id} done — ${results.length} target flights found`);
  } catch (err) {
    console.error(`[Scraper] Window ${window.id} error: ${err.message}`);
  }

  return results;
}

module.exports = { scrapeWindow };
