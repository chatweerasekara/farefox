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
    direction: f.direction || 'MEL-CMB',
  }));
  const { error } = await supabase.from('flights').insert(rows);
  if (error) console.error('[DB] Insert error:', error.message);
}

async function readFlights(windowId, direction = 'MEL-CMB') {
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('flights')
      .select('*')
      .eq('window_id', windowId)
      .eq('direction', direction)
      .order('timestamp', { ascending: true })
      .range(from, from + pageSize - 1);
    
    if (error) {
      console.error('[DB] Read error:', error.message);
      break;
    }
    
    allData = [...allData, ...data];
    
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  return allData.map(r => ({
    timestamp: r.timestamp,
    window: r.window_id,
    departure_date: r.departure_date,
    airline: r.airline,
    price_aud: parseFloat(r.price_aud),
    stops: r.stops,
    duration_mins: r.duration_mins,
    departure_time: r.departure_time,
    arrival_time: r.arrival_time,
    direction: r.direction,
  }));
}

async function getScanCount() {
  const { data, error } = await supabase
    .from('flights')
    .select('timestamp');
  if (error) {
    console.error('[DB] Scan count error:', error.message);
    return 0;
  }
  const unique = new Set(data.map(r => r.timestamp));
  return unique.size;
}
async function updateScanStatus(lastRun, lastStatus) {
  const { error } = await supabase
    .from('scan_status')
    .upsert({ id: 1, last_run: lastRun, last_status: lastStatus });
  if (error) console.error('[DB] Update scan status error:', error.message);
}

async function getScanStatus() {
  const { data, error } = await supabase
    .from('scan_status')
    .select('*')
    .eq('id', 1)
    .single();
  if (error || !data) return { lastRun: null, lastStatus: 'never' };
  return { lastRun: data.last_run, lastStatus: data.last_status };
}

async function addSubscriber({ email, threshold, window_1, window_2, mel_cmb = true, cmb_mel = true }) {
  const { data, error } = await supabase
    .from('subscribers')
    .upsert({ email, threshold, window_1, window_2, mel_cmb, cmb_mel }, { onConflict: 'email' })
    .select()
    .single();
  if (error) {
    console.error('[DB] Subscribe error:', error.message);
    throw error;
  }
  return data;
}

async function getSubscribers() {
  const { data, error } = await supabase
    .from('subscribers')
    .select('*');
  if (error) {
    console.error('[DB] Get subscribers error:', error.message);
    return [];
  }
  return data;
}

async function removeSubscriber(email) {
  const { error } = await supabase
    .from('subscribers')
    .delete()
    .eq('email', email.toLowerCase().trim());
  if (error) {
    console.error('[DB] Unsubscribe error:', error.message);
    throw error;
  }
}

module.exports = { appendFlights, readFlights, getScanCount, addSubscriber, getSubscribers, removeSubscriber, updateScanStatus, getScanStatus };
