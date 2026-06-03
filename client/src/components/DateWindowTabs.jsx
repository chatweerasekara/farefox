export default function DateWindowTabs({ windows, active, onChange }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="flex">
        {windows.map((w, i) => (
          <button
            key={w.id}
            onClick={() => onChange(w.id)}
            className={[
              'flex-1 px-6 py-4 text-sm font-medium transition-colors relative',
              i > 0 ? 'border-l border-gray-100' : '',
              active === w.id ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            ].join(' ')}
            style={active === w.id ? {background: '#0a0a0a', borderBottom: '2px solid #C17B2A'} : {}}
          >
            <span className="block text-xs mb-0.5 font-normal" style={{color: active === w.id ? '#7a5020' : undefined, opacity: active === w.id ? 1 : 0.5}}>
              {w.season}
            </span>
            <span className="block font-medium">{w.label}</span>
            <span className="block text-xs mt-0.5 font-normal" style={{color: active === w.id ? '#555' : undefined, opacity: active === w.id ? 1 : 0.4}}>
              {w.dateRange}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
