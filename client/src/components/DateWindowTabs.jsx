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
              active === w.id
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            ].join(' ')}
          >
            <span className="block text-xs opacity-60 mb-0.5 font-normal">
              {w.id === 1 ? 'Summer' : 'Autumn'}
            </span>
            {w.label}
          </button>
        ))}
      </div>
    </div>
  );
}
