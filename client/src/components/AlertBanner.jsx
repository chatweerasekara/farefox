import { useState } from 'react';

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return dateStr; }
}

function AlertRow({ alert }) {
  const dur = alert.duration_mins
    ? `${Math.floor(alert.duration_mins / 60)}h ${alert.duration_mins % 60}m`
    : null;
  return (
    <div className="flex items-start gap-3">
      <span className="text-xl leading-none mt-0.5" style={{ color: '#C17B2A' }}>▼</span>
      <div className="flex-1">
        <p className="font-semibold text-sm" style={{ color: '#7a4a10' }}>
          Price alert!{' '}
          <span className="font-bold">{alert.airline}</span>{' '}
          dropped to{' '}
          <span className="font-bold" style={{ color: '#C17B2A' }}>A${alert.price_aud.toFixed(0)}</span>
        </p>
        <p className="text-xs mt-1" style={{ color: '#a06530' }}>
          Departs {fmtDate(alert.departure_date)}
          {alert.stops != null && ` · ${alert.stops === 0 ? 'Direct' : `${alert.stops} stop${alert.stops > 1 ? 's' : ''}`}`}
          {dur && ` · ${dur}`}
        </p>
      </div>
    </div>
  );
}

export default function AlertBanner({ alerts }) {
  const [expanded, setExpanded] = useState(false);
  if (!alerts?.length) return null;
  const cheapest = alerts[0];
  const rest = alerts.slice(1);
  return (
    <div className="rounded-2xl px-6 py-4" style={{ background: 'rgba(193,123,42,0.08)', border: '1px solid rgba(193,123,42,0.2)' }}>
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5" style={{ color: '#C17B2A' }}>▼</span>
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: '#7a4a10' }}>
            Price alert!{' '}
            <span className="font-bold">{cheapest.airline}</span>{' '}
            dropped to{' '}
            <span className="font-bold" style={{ color: '#C17B2A' }}>A${cheapest.price_aud.toFixed(0)}</span>
          </p>
          <p className="text-xs mt-1" style={{ color: '#a06530' }}>
            Departs {fmtDate(cheapest.departure_date)}
            {cheapest.stops != null && ` · ${cheapest.stops === 0 ? 'Direct' : `${cheapest.stops} stop${cheapest.stops > 1 ? 's' : ''}`}`}
            {cheapest.duration_mins && ` · ${Math.floor(cheapest.duration_mins / 60)}h ${cheapest.duration_mins % 60}m`}
          </p>
        </div>
        {rest.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs font-medium whitespace-nowrap"
            style={{ color: '#C17B2A', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {expanded ? '▲ less' : `+${rest.length} more`}
          </button>
        )}
      </div>
      {expanded && rest.length > 0 && (
        <div className="mt-3 space-y-3 pt-3" style={{ borderTop: '0.5px solid rgba(193,123,42,0.2)' }}>
          {rest.map((alert, i) => (
            <AlertRow key={i} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
