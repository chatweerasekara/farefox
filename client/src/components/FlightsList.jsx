function dur(mins) {
  if (!mins) return '—';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fmt(isoStr) {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return dateStr; }
}

function getSkyscannerUrl(date) {
  const d = new Date(date);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `https://www.skyscanner.com.au/transport/flights/mel/cmb/${yy}${mm}${dd}/?adults=1&cabinclass=economy&rtn=0&currency=AUD`;
}

function getAirlineCode(airline) {
  const a = airline.toLowerCase();
  if (a.includes('jetstar')) return 'JQ';
  if (a.includes('sri')) return 'UL';
  return airline.slice(0, 2).toUpperCase();
}

function getWhatsAppShareText(flight) {
  const text = `✈ Farefox found ${flight.airline} MEL→CMB on ${fmtDate(flight.departure_date)} for A$${flight.price_aud.toFixed(0)} (one way). Check it out: https://farefox-seven.vercel.app`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function FlightRow({ flight, rank }) {
  const isAlert = flight.price_aud < 1100;
  const bookingUrl = getSkyscannerUrl(flight.departure_date);
  const shareUrl = getWhatsAppShareText(flight);
  const code = getAirlineCode(flight.airline);

  return (
    <div className={[
      'rounded-xl transition-colors p-4',
      isAlert ? 'bg-amber-50 border border-amber-200' : 'border border-gray-100 hover:border-gray-200',
    ].join(' ')}>

      {/* Top row — rank, badge, airline, price, book */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-gray-300 w-4 flex-shrink-0">{rank}</span>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0"
          style={{
  background: code === 'JQ' ? '#FF5A00' : code === 'UL' ? '#003875' : '#f5f5f5',
  color: code === 'JQ' ? '#fff' : code === 'UL' ? '#FFD700' : '#888',
  border: 'none'
}}
        >
          {code}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{flight.airline}</p>
          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(flight.departure_date)}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={['text-base font-bold', isAlert ? 'text-amber-600' : 'text-gray-900'].join(' ')}>
            A${flight.price_aud.toFixed(0)}
          </p>
          {isAlert ? (
            <p className="text-xs text-amber-500 font-medium mt-0.5">Under threshold</p>
          ) : (
            <p className="text-xs text-gray-300 mt-0.5">Confirm on site</p>
          )}
        </div>
      </div>

      {/* Bottom row — times + actions */}
      <div className="flex items-center justify-between mt-3 pl-12">
        <div>
          <p className="text-sm text-gray-700 font-medium">
            {fmt(flight.departure_time)} → {fmt(flight.arrival_time)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
            {' · '}{dur(flight.duration_mins)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              'text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap',
              isAlert ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-900 text-white hover:bg-gray-700',
            ].join(' ')}
          >
            Book →
          </a>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
            title="Share on WhatsApp"
          >
            Share
          </a>
        </div>
      </div>

    </div>
  );
}

export default function FlightsList({ flights, loading }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-gray-900">Cheapest Flights</span>
        {flights.length > 0 && (
          <>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200">One way</span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200">Latest scan</span>
          </>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : flights.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-2 text-gray-300">
          <span className="text-4xl">✈️</span>
          <span className="text-sm">No flights found yet — hit Scan Now to fetch prices</span>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {flights.slice(0, 15).map((f, i) => (
              <FlightRow key={i} flight={f} rank={i + 1} />
            ))}
          </div>
          <p className="text-xs text-gray-300 text-center mt-4">
            Prices are indicative and may vary. Always confirm on the airline site before booking.
          </p>
        </>
      )}
    </div>
  );
}
