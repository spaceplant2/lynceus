import React, { useEffect, useState } from 'react';
import { fetchDevices } from './api';
import PowerCard from './components/PowerCard';

export default function App() {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await fetchDevices();
      setDevices(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <header className="max-w-7xl mx-auto mb-8 border-b border-slate-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Lynceus</h1>
          <p className="text-sm text-slate-400">Power Infrastructure Dashboard</p>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Auto-refreshing (5s)
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {loading && <p className="text-slate-400">Loading infrastructure data...</p>}
        {error && <div className="p-4 bg-red-500/10 text-red-400 rounded border border-red-500/20 mb-6">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => (
            <PowerCard key={device.device_id} device={device} />
          ))}
        </div>
      </main>
    </div>
  );
}
