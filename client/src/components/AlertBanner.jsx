export default function AlertBanner({ alerts }) {
  if (!alerts?.length) return null;
  const cheapest = alerts[0];
  const dur = cheapest.duration_mins
    ? `${Math.floor(cheapest.duration_mins / 60)}h ${cheapest.duration_mins % 60}m`
    : null;

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4">
      <div className="flex items-start gap-3">
        <span className="text-emerald-500 text-xl leading-none mt-0.5">▼</span>
        <div className="flex-1">
          <p className="font-semibold text-emerald-900 text-sm">
            Price alert!{' '}
            <span className="font-bold">{cheapest.airline}</span>{' '}
            dropped to{' '}
            <span className="text-emerald-700 font-bold">A${cheapest.price_aud.toFixed(0)}</span>
          </p>
          <p className="text-emerald-600 text-xs mt-1">
            Departs {cheapest.departure_date}
            {cheapest.stops != null && ` · ${cheapest.stops === 0 ? 'Direct' : `${cheapest.stops} stop${cheapest.stops > 1 ? 's' : ''}`}`}
            {dur && ` · ${dur}`}
          </p>
        </div>
        {alerts.length > 1 && (
          <span className="text-emerald-400 text-xs font-medium whitespace-nowrap">
            +{alerts.length - 1} more
          </span>
        )}
      </div>
    </div>
  );
}
