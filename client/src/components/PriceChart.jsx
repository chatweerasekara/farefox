import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2 text-left">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-bold text-gray-900">A${payload[0].value.toFixed(0)}</p>
    </div>
  );
}

export default function PriceChart({ history, loading }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
        Price History  <span className="font-normal text-gray-300">— daily min</span>
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
              tickFormatter={d => d.slice(5)} // show MM-DD
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
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'A$1,100', position: 'insideTopRight', fontSize: 10, fill: '#10b981' }}
            />
            <Line
              type="monotone"
              dataKey="minPrice"
              stroke="#111827"
              strokeWidth={2}
              dot={{ r: 3, fill: '#111827', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#111827' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
