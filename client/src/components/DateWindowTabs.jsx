function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function DateWindowTabs({ windows, active, onChange }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="flex">
        {windows.map((w, i) => {
          const days = w.startDate ? daysUntil(w.startDate) : null;
          const isActive = active === w.id;
          const windowOpen = days !== null && days <= 0;
          const countdown = days !== null && days > 0
            ? `Opens in ${days} day${days !== 1 ? 's' : ''}`
            : windowOpen ? 'Window open now' : null;

          return (
            <button
              key={w.id}
              onClick={() => onChange(w.id)}
              className={[
                'flex-1 px-6 py-4 text-sm font-medium transition-colors relative',
                i > 0 ? 'border-l border-gray-100' : '',
                isActive ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700',
              ].join(' ')}
              style={isActive ? {background: '#0a0a0a', borderBottom: '2px solid #C17B2A'} : {}}
            >
              <span className="block text-xs mb-0.5 font-normal" style={{color: isActive ? '#7a5020' : undefined, opacity: isActive ? 1 : 0.5}}>
                {w.season}
              </span>
              <span className="block font-medium">{w.label}</span>
              <span className="block text-xs mt-0.5 font-normal" style={{color: isActive ? '#555' : undefined, opacity: isActive ? 1 : 0.4}}>
                {w.dateRange}
              </span>
              {countdown && (
                <span
                  className="block text-xs mt-1.5 font-medium"
                  style={{
                    color: isActive
                      ? (windowOpen ? '#22c55e' : '#C17B2A')
                      : (windowOpen ? '#22c55e' : '#aaa'),
                  }}
                >
                  {windowOpen ? '🟢 ' : '🕐 '}{countdown}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
