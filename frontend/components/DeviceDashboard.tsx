// frontend/components/DeviceDashboard.tsx
'use client';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function DeviceDashboard() {
  const [telemetry, setTelemetry] = useState<any>({});
  const [profiles, setProfiles] = useState<any>({});
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const eventSource = new EventSource(`${apiBase}/api/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setTelemetry(data);

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setHistory((prev) => {
        const updated = { ...prev };
        for (const [ip, device] of Object.entries(data) as [string, any][]) {
          if (!updated[ip]) updated[ip] = [];
          const metricsRecord: Record<string, any> = { time: now };
          
          if (device.metrics) {
            for (const [mKey, mVal] of Object.entries(device.metrics) as [string, any][]) {
              const val = typeof mVal === 'object' && mVal !== null ? mVal.value : mVal;
              metricsRecord[mKey] = typeof val === 'number' ? val : 0;
            }
          }

          updated[ip] = [...updated[ip].slice(-20), metricsRecord];
        }
        return updated;
      });
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };

    fetch(`${apiBase}/api/profiles`)
      .then((res) => res.json())
      .then((data) => setProfiles(data))
      .catch((err) => console.error('Failed to fetch profiles:', err));

    return () => {
      eventSource.close();
    };
  }, [apiBase]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="mb-10 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Lynceus Hardware Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time SNMP Telemetry & Profile Management v0.4.0</p>
      </header>

      {/* Live Telemetry Section */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-emerald-400">Live Device Telemetry</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.keys(telemetry).length === 0 ? (
            <div className="col-span-full p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400 animate-pulse">
              Waiting for live SNMP telemetry stream...
            </div>
          ) : (
            Object.entries(telemetry).map(([ip, device]: [string, any]) => (
              <div key={ip} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 bg-emerald-950 text-emerald-400 rounded-full border border-emerald-800">
                      {device.device_type || 'Unknown Device'}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium uppercase tracking-wider border ${
                      device.status === 'offline' ? 'bg-rose-950 text-rose-400 border-rose-800' :
                      device.status === 'degraded' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                      'bg-emerald-950 text-emerald-400 border-emerald-800'
                    }`}>
                      {device.status || 'online'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-slate-400 font-mono mb-4">{ip}</div>

                  <div className="space-y-3 my-4">
                    {device.metrics && Object.entries(device.metrics).map(([metricName, metricData]: [string, any]) => {
                      const isObj = typeof metricData === 'object' && metricData !== null;
                      const val = isObj ? metricData.value : metricData;
                      const status = isObj ? metricData.status : 'normal';
                      const unit = isObj ? metricData.unit : '';

                      return (
                        <div 
                          key={metricName} 
                          className={`p-3 rounded-lg border flex justify-between items-center transition-colors ${
                            status === 'critical' ? 'bg-rose-950/40 border-rose-800 text-rose-300' :
                            status === 'warning' ? 'bg-amber-950/40 border-amber-800 text-amber-300' :
                            'bg-slate-950 border-slate-800/60 text-slate-300'
                          }`}
                        >
                          <div>
                            <span className="text-xs capitalize block font-medium">{metricName.replace('_', ' ')}</span>
                            {status !== 'normal' && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-900 border border-current mt-0.5 inline-block">
                                {status}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold font-mono">{val}</span>
                            {unit && <span className="text-xs ml-1 text-slate-400">{unit}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {history[ip] && history[ip].length > 1 && (
                    <div className="h-36 w-full mt-4 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history[ip]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px' }} />
                          {Object.keys(history[ip][0] || {})
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
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
                  <span>Status: Active</span>
                  <span>Last Poll: {device.timestamp ? new Date(device.timestamp * 1000).toLocaleTimeString() : 'N/A'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* YAML Profiles Inspector Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-sky-400">Loaded SNMP Profiles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.keys(profiles).length === 0 ? (
            <div className="col-span-full p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400">
              No YAML profiles detected in backend memory.
            </div>
          ) : (
            Object.entries(profiles).map(([deviceType, profile]) => {
              const typedProfile = profile as any;
              return (
                <div key={deviceType} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-200 capitalize">{deviceType.replace('_', ' ')}</h3>
                    <span className="text-xs font-mono bg-sky-950 text-sky-400 px-2.5 py-1 rounded border border-sky-800">
                      SysOID: {typedProfile.sys_object_id || 'N/A'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mapped OID Metrics</h4>
                    {typedProfile.metrics && Object.entries(typedProfile.metrics).map(([metricKey, metricVal]: [string, any]) => (
                      <div key={metricKey} className="bg-slate-950 p-3 rounded border border-slate-800/60 flex justify-between items-center text-sm font-mono">
                        <span className="text-slate-300 capitalize">{metricKey.replace('_', ' ')}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-500 truncate max-w-[120px]">{metricVal.oid}</span>
                          <span className="text-xs bg-slate-900 px-2 py-0.5 rounded text-emerald-400 border border-slate-800">
                            {metricVal.unit || 'unit'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}