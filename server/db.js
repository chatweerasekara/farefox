const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function appendFlights(flights) {
  if (!flights.length) return;
  const rows = flights.map(f => ({
    timestamp: f.timestamp,
    window_id: f.window,
    departure_date: f.departure_date,
    airline: f.airline,
    price_aud: f.price_aud,
    stops: f.stops,
    duration_mins: f.duration_mins,
    departure_time: f.departure_time || null,
    arrival_time: f.arrival_time || null,
  }));
  const { error } = await supabase.from('flights').insert(rows);
  if (error) console.error('[DB] Insert error:', error.message);
}

async function readFlights(windowId) {
  const { data, error } = await supabase
    .from('flights')
    .select('*')
    .eq('window_id', windowId)
    .order('timestamp', { ascending: true });
  if (error) {
    console.error('[DB] Read error:', error.message);
    return [];
  }
  return data.map(r => ({
    timestamp: r.timestamp,
    window: r.window_id,
    departure_date: r.departure_date,
    airline: r.airline,
    price_aud: parseFloat(r.price_aud),
    stops: r.stops,
    duration_mins: r.duration_mins,
    departure_time: r.departure_time,
    arrival_time: r.arrival_time,
  }));
}

module.exports = { appendFlights, readFlights };
