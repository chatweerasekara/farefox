function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return dateStr; }
}

export default function AlertBanner({ alerts }) {
  if (!alerts?.length) return null;
  const cheapest = alerts[0];
  const dur = cheapest.duration_mins
    ? `${Math.floor(cheapest.duration_mins / 60)}h ${cheapest.duration_mins % 60}m`
    : null;
  return (
    <div className="rounded-2xl px-6 py-4" style={{background: 'rgba(193,123,42,0.08)', border: '1px solid rgba(193,123,42,0.2)'}}>
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5" style={{color: '#C17B2A'}}>▼</span>
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{color: '#7a4a10'}}>
            Price alert!{' '}
            <span className="font-bold">{cheapest.airline}</span>{' '}
            dropped to{' '}
            <span className="font-bold" style={{color: '#C17B2A'}}>A${cheapest.price_aud.toFixed(0)}</span>
          </p>
          <p className="text-xs mt-1" style={{color: '#a06530'}}>
            Departs {fmtDate(cheapest.departure_date)}
            {cheapest.stops != null && ` · ${cheapest.stops === 0 ? 'Direct' : `${cheapest.stops} stop${cheapest.stops > 1 ? 's' : ''}`}`}
            {dur && ` · ${dur}`}
          </p>
        </div>
        {alerts.length > 1 && (
          <span className="text-xs font-medium whitespace-nowrap" style={{color: '#C17B2A'}}>
            +{alerts.length - 1} more
          </span>
        )}
      </div>
    </div>
  );
}
