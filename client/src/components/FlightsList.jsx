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

function getBookingUrl(airline, date) {
  const isJetstar = airline.toLowerCase().includes('jetstar');
  const isSriLankan = airline.toLowerCase().includes('sri');
  if (isJetstar) {
    // Jetstar MEL→CMB deep link
    return `https://www.jetstar.com/au/en/flights/results?from=MEL&to=CMB&departDate=${date}&adults=1&children=0&infants=0&cabin=Y`;
  }
  if (isSriLankan) {
    // SriLankan Airlines search
    return `https://www.srilankan.com/en_uk/fly-with-us/book-a-flight?from=MEL&to=CMB&departDate=${date}&adults=1`;
  }
  // Fallback to Google Flights
  return `https://www.google.com/travel/flights?q=flights+from+MEL+to+CMB+on+${date}`;
}

function FlightRow({ flight, rank }) {
  const isAlert = flight.price_aud < 1100;
  const bookingUrl = getBookingUrl(flight.airline, flight.departure_date);

  return (
    <div className={[
      'flex items-center justify-between py-4 px-5 rounded-xl transition-colors',
      isAlert ? 'bg-emerald-50 border border-emerald-100' : 'border border-gray-100 hover:border-gray-200',
    ].join(' ')}>
      <div className="flex items-center gap-4">
        <span className="text-xs font-bold text-gray-300 w-4">{rank}</span>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{flight.airline}</p>
          <p className="text-xs text-gray-400 mt-0.5">{flight.departure_date}</p>
        </div>
      </div>
      <div className="hidden sm:flex flex-col items-center text-center">
        <span className="text-sm text-gray-700 font-medium">
          {fmt(flight.departure_time)} → {fmt(flight.arrival_time)}
        </span>
        <span className="text-xs text-gray-400 mt-0.5">
          {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
          {' · '}{dur(flight.duration_mins)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={['text-lg font-bold', isAlert ? 'text-emerald-700' : 'text-gray-900'].join(' ')}>
            A${flight.price_aud.toFixed(0)}
          </p>
          {isAlert && (
            <p className="text-xs text-emerald-600 font-medium mt-0.5">Under threshold</p>
          )}
        </div>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            'text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap',
            isAlert
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-gray-900 text-white hover:bg-gray-700',
          ].join(' ')}
        >
          Book →
        </a>
      </div>
    </div>
  );
}

export default function FlightsList({ flights, loading }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
        Cheapest Flights
        {flights.length > 0 && (
          <span className="ml-2 font-normal text-gray-300">— latest scan</span>
        )}
      </h2>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : flights.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-2 text-gray-300">
          <span className="text-4xl">✈️</span>
          <span className="text-sm">No flights found yet — hit Scan Now to fetch prices</span>
        </div>
      ) : (
        <div className="space-y-2">
          {flights.slice(0, 15).map((f, i) => (
            <FlightRow key={i} flight={f} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
