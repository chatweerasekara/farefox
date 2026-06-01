export default function HeroStat({ price, window, loading }) {
  return (
    <div className="bg-gray-950 rounded-2xl px-8 py-10 text-white">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Lowest Price Found</p>
          <div className="mt-3 flex items-baseline gap-2">
            {loading ? (
              <div className="h-14 w-48 bg-gray-800 rounded-xl animate-pulse" />
            ) : price ? (
              <>
                <span className="text-6xl font-bold tracking-tight">A${price.toFixed(0)}</span>
                <span className="text-gray-400 text-xl font-medium">AUD</span>
              </>
            ) : (
              <span className="text-3xl font-medium text-gray-500">No data yet</span>
            )}
          </div>
          {window && (
            <p className="mt-3 text-gray-500 text-sm">
              Window:{' '}
              <span className="text-gray-300 font-medium">{window.label}</span>
            </p>
          )}
        </div>
        <div className="sm:text-right shrink-0">
          <p className="text-gray-600 text-xs font-semibold uppercase tracking-widest">Alert Threshold</p>
          <p className="mt-2 text-3xl font-bold text-white">A$1,100</p>
          <p className="mt-1 text-gray-500 text-xs">Jetstar · SriLankan Airlines</p>
        </div>
      </div>
    </div>
  );
}
