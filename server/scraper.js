const axios = require('axios');
const HOST = 'flights-sky.p.rapidapi.com';
const TARGET_AIRLINES = ['jetstar', 'srilankan', 'sri lankan airlines'];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

function extractTargetFlights(apiData, date, windowId, timestamp) {
  const itineraries = apiData?.data?.itineraries ?? [];
  return itineraries
    .filter(it => {
      const leg = it.legs?.[0];
      const airline = (leg?.carriers?.marketing?.[0]?.name ?? '').toLowerCase();
      const isDirect = (leg?.stopCount ?? 1) === 0;
      return isDirect && TARGET_AIRLINES.some(t => airline.includes(t));
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

async function scrapeWindow(window) {
  const scanTimestamp = new Date().toISOString();
  const sampledDates = window.dates;
  console.log(`[Scraper] Window ${window.id} "${window.label}" — ${sampledDates.length} dates`);
  const results = [];
  for (const date of sampledDates) {
    try {
      console.log(`[Scraper]   → ${date}`);
      const data = await searchFlightsForDate(date);
      const flights = extractTargetFlights(data, date, window.id, scanTimestamp);
      results.push(...flights);
      await sleep(1200);
    } catch (err) {
      console.error(`[Scraper]   ✗ ${date}: ${err.message}`);
    }
  }
  console.log(`[Scraper] Window ${window.id} done — ${results.length} target flights found`);
  return results;
}

module.exports = { scrapeWindow };
