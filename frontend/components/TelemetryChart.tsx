'use client';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function TelemetryChart({ ip }: { ip: string }) {
  const [data, setData] = useState<any[]>([]);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${apiBase}/api/history/${ip}`);
        const history = await res.json();
        // Format timestamps for chart display
        const formatted = history.map((item: any) => ({
          time: new Date(item.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          ...Object.fromEntries(
            Object.entries(item.metrics || {}).map(([k, v]) => [k, typeof v === 'number' ? v : 0])
          )
        }));
        setData(formatted);
      } catch (err) {
        console.error('Failed to fetch telemetry history:', err);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [ip, apiBase]);

  if (data.length === 0) return <div className="text-xs text-slate-500 p-4">Loading telemetry trend...</div>;

  return (
    <div className="h-48 w-full mt-4 bg-slate-950 p-2 rounded-lg border border-slate-800">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" stroke="#64748b" textAnchor="end" tick={{ fontSize: 10 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
          {Object.keys(data[0] || {})
            .filter((k) => k !== 'time')
            .map((metricKey, idx) => (
              <Line
                key={metricKey}
                type="monotone"
                dataKey={metricKey}
                stroke={idx === 0 ? '#34d399' : '#38bdf8'}
                strokeWidth={2}
                dot={false}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}