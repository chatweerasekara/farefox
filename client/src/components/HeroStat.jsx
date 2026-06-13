const THRESHOLD = 1100;

export default function HeroStat({ price, window, windowMeta, loading, history, direction, onDirectionChange }) {
  const isBelow = price !== null && price < THRESHOLD;
  const isAbove = price !== null && price >= THRESHOLD;

  const yearLabel = windowMeta
    ? (() => {
        const startYear = windowMeta.startDate?.slice(0, 4);
        const endYear = windowMeta.endDate?.slice(0, 4);
        return startYear && endYear && startYear !== endYear
          ? `${startYear}–${endYear}`
          : endYear ?? startYear ?? null;
      })()
    : null;

  const trend = (() => {
    if (!history || history.length < 2 || !price) return null;
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const prev = sorted[sorted.length - 2]?.minPrice;
    if (!prev) return null;
    const diff = price - prev;
    if (Math.abs(diff) < 1) return { type: 'flat', diff: 0 };
    return { type: diff < 0 ? 'down' : 'up', diff: Math.abs(Math.round(diff)) };
  })();

  const trendStyles = {
    down: { background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '0.5px solid rgba(34,197,94,0.25)' },
    up: { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '0.5px solid rgba(239,68,68,0.25)' },
    flat: { background: 'rgba(255,255,255,0.06)', color: '#888', border: '0.5px solid rgba(255,255,255,0.1)' },
  };

  const trendLabel = {
    down: `↓ A$${trend?.diff} cheaper`,
    up: `↑ A$${trend?.diff} more expensive`,
    flat: '→ No change',
  };

  return (
    <div className="rounded-2xl px-8 py-10 text-white" style={{background: '#0a0a0a'}}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{color: '#555'}}>Lowest Price Found</p>
          <div className="mt-3 flex items-baseline gap-2">
            {loading ? (
              <div className="h-14 w-48 rounded-xl animate-pulse" style={{background: '#1a1a1a'}} />
            ) : price ? (
              <>
                <span className="text-6xl font-medium tracking-tight" style={{color: '#E8973A', letterSpacing: '-0.02em'}}>A${price.toFixed(0)}</span>
                <span className="text-xl font-medium" style={{color: '#7a5020'}}>AUD</span>
              </>
            ) : (
              <span className="text-3xl font-medium" style={{color: '#444'}}>No flights found under A$1,100</span>
            )}
          </div>

          {!loading && price && trend && (
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={trendStyles[trend.type]}>
                {trendLabel[trend.type]}
              </span>
              <span className="text-xs" style={{color: '#555'}}>vs yesterday</span>
            </div>
          )}

          <div className="inline-flex mt-3" style={{background: '#1a1a1a', borderRadius: 20, padding: 3}}>
            <button onClick={() => onDirectionChange('MEL-CMB')}
              style={{fontSize:12, fontWeight:500, color: direction === 'MEL-CMB' ? '#fff' : '#555', background: direction === 'MEL-CMB' ? '#C17B2A' : 'transparent', border:'none', borderRadius:16, padding:'5px 14px', cursor:'pointer'}}>
              ✈ MEL → CMB
            </button>
            <button onClick={() => onDirectionChange('CMB-MEL')}
              style={{fontSize:12, fontWeight:500, color: direction === 'CMB-MEL' ? '#fff' : '#555', background: direction === 'CMB-MEL' ? '#C17B2A' : 'transparent', border:'none', borderRadius:16, padding:'5px 14px', cursor:'pointer'}}>
              ✈ CMB → MEL
            </button>
          </div>

          {window && (
            <div className="mt-3">
              <p className="text-sm font-medium" style={{color: '#ccc'}}>{window.label}</p>
              <p className="text-sm" style={{color: '#666'}}>
                {window.dateRange}
                {yearLabel && <span style={{color: '#444'}}> · {yearLabel}</span>}
              </p>
            </div>
          )}
        </div>

        <div className="sm:text-right shrink-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{color: '#444'}}>Alert Threshold</p>
          <p className="mt-2 text-3xl font-medium text-white">A${THRESHOLD.toLocaleString()}</p>
          <p className="mt-1 text-xs" style={{color: '#444'}}>Jetstar · SriLankan Airlines</p>
          <p className="mt-1 text-xs" style={{color: '#444'}}>🔔 Alerts when price drops below A${THRESHOLD.toLocaleString()}</p>

          {!loading && (
            <div className="mt-3 flex sm:justify-end">
              {isBelow && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{background: 'rgba(193,123,42,0.15)', color: '#E8973A', border: '0.5px solid rgba(193,123,42,0.3)'}}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{background: '#E8973A'}} />
                  Below threshold · Alert sent
                </span>
              )}
              {isAbove && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{background: 'rgba(220,60,60,0.15)', color: '#ff6b6b', border: '0.5px solid rgba(220,60,60,0.3)'}}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{background: '#ff6b6b'}} />
                  Above threshold
                </span>
              )}
              {!price && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{background: 'rgba(255,255,255,0.05)', color: '#555', border: '0.5px solid rgba(255,255,255,0.1)'}}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{background: '#555'}} />
                  No flights found under A$1,100
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
