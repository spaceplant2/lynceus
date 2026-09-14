
import React, { useState } from 'react';
import { Eye, Edit3, Network, Terminal, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

const API_BASE = "http://localhost:8000/api/v1/snmp";

export default function App() {
  const [activeTab, setActiveTab] = useState('get');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Form State
  const [form, setForm] = useState({
    ip: '127.0.0.1',
    port: 161,
    community: 'public',
    oid: '1.3.6.1.2.1.1.1.0',
    value: '',
    value_type: 'str'
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const executeAction = async (endpoint, payload) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Request failed');
      
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'get') {
      executeAction('get', {
        ip: form.ip,
        port: parseInt(form.port),
        community: form.community,
        oid: form.oid
      });
    } else if (activeTab === 'set') {
      executeAction('set', {
        ip: form.ip,
        port: parseInt(form.port),
        community: form.community,
        oid: form.oid,
        value: form.value,
        value_type: form.value_type
      });
    } else if (activeTab === 'walk') {
      executeAction('walk', {
        ip: form.ip,
        port: parseInt(form.port),
        community: form.community,
        oid: form.oid
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Eye className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold tracking-wide">LYNCEUS</h1>
            <p className="text-xs text-slate-400">SNMP Network Control Suite</p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Form Controls */}
        <div className="md:col-span-6 bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800 pb-3 mb-6 space-x-2">
              <button
                onClick={() => { setActiveTab('get'); setResult(null); setError(null); }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'get' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-900'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>GET</span>
              </button>
              <button
                onClick={() => { setActiveTab('set'); setResult(null); setError(null); }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'set' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-900'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>SET</span>
              </button>
              <button
                onClick={() => { setActiveTab('walk'); setResult(null); setError(null); }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'walk' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-900'
                }`}
              >
                <Network className="w-4 h-4" />
                <span>WALK</span>
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Target IP</label>
                  <input
                    type="text"
                    name="ip"
                    value={form.ip}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Port</label>
                  <input
                    type="number"
                    name="port"
                    value={form.port}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Community String</label>
                <input
                  type="text"
                  name="community"
                  value={form.community}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {activeTab === 'walk' ? 'Base OID' : 'Target OID'}
                </label>
                <input
                  type="text"
                  name="oid"
                  value={form.oid}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Conditional SET input controls */}
              {activeTab === 'set' && (
                <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">New Value</label>
                    <input
                      type="text"
                      name="value"
                      value={form.value}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Data Type</label>
                    <select
                      name="value_type"
                      value={form.value_type}
                      onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="str">String</option>
                      <option value="int">Integer</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold py-2.5 rounded-lg transition flex items-center justify-center space-x-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                <span>Execute {activeTab.toUpperCase()}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Output / Result Panel */}
        <div className="md:col-span-6 bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col">
          <h2 className="text-sm font-semibold text-slate-400 border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
            <span>RESPONSE PAYLOAD</span>
            {result && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {error && <AlertCircle className="w-4 h-4 text-rose-500" />}
          </h2>

          <div className="flex-1 bg-slate-900 rounded-lg p-4 font-mono text-xs overflow-x-auto border border-slate-800">
            {loading && (
              <div className="h-full flex items-center justify-center text-slate-500 space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Querying target device...</span>
              </div>
            )}

            {error && (
              <div className="text-rose-400 space-y-1">
                <p className="font-bold">[ERROR]</p>
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && !result && (
              <div className="h-full flex items-center justify-center text-slate-600">
                Awaiting request submission...
              </div>
            )}

            {result && (
              <div>
                {result.results ? (
                  /* SNMP Walk Results Table */
                  <div className="space-y-2">
                    <p className="text-cyan-400 mb-2">Returned {result.results.length} OID bindings:</p>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500">
                          <th className="py-1 px-1">OID</th>
                          <th className="py-1 px-1">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.results.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/40">
                            <td className="py-1 px-1 text-slate-400">{row.oid}</td>
                            <td className="py-1 px-1 text-slate-200">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* SNMP Get / Set Single Result */
                  <div className="space-y-2">
                    <p><span className="text-slate-500">Target:</span> {result.ip}</p>
                    <p><span className="text-slate-500">OID:</span> {result.oid}</p>
                    <p><span className="text-slate-500">Value:</span> <span className="text-emerald-400 font-semibold">{result.value}</span></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
