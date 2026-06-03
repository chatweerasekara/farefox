import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short'
    });
  } catch { return dateStr; }
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-left" style={{boxShadow: 'none'}}>
      <p className="text-xs text-gray-400">{fmtDate(label)}</p>
      <p className="text-sm font-medium text-gray-900">A${payload[0].value.toFixed(0)}</p>
    </div>
  );
}

export default function PriceChart({ history, loading }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
        Price History <span className="font-normal text-gray-300">— daily min</span>
      </h2>
      {loading ? (
        <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
      ) : history.length === 0 ? (
        <div className="h-52 flex flex-col items-center justify-center gap-2 text-gray-300">
          <span className="text-3xl">📈</span>
          <span className="text-sm">No history yet — run a scan to start tracking</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#d1d5db' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={d => fmtDate(d)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#d1d5db' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `$${v}`}
              domain={['auto', 'auto']}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={1100}
              stroke="#C17B2A"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'A$1,100', position: 'insideTopRight', fontSize: 10, fill: '#C17B2A' }}
            />
            <Line
              type="monotone"
              dataKey="minPrice"
              stroke="#C17B2A"
              strokeWidth={2}
              dot={{ r: 3, fill: '#C17B2A', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#C17B2A' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
