'use client';

import React, { useState } from 'react';
import { Terminal, Send, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SnmpCommandModalProps {
  deviceId: string;
  deviceName: string;
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function SnmpCommandModal({ deviceId, deviceName, isOpen, onClose }: SnmpCommandModalProps) {
  const [commandType, setCommandType] = useState<'get' | 'set' | 'walk'>('get');
  const [oid, setOid] = useState<string>('1.3.6.1.2.1.1.5.0'); // Default sysName
  const [community, setCommunity] = useState<string>('public');
  const [setValue, setSetValue] = useState<string>('');
  const [valueType, setValueType] = useState<string>('string');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [responseLog, setResponseLog] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponseLog(null);

    let endpoint = `${API_BASE}/api/snmp/get`;
    let payload: any = { host: deviceId, community, oid, port: 161 };

    if (commandType === 'set') {
      endpoint = `${API_BASE}/api/snmp/set`;
      payload = { host: deviceId, community: community || 'private', oid, value: setValue, type: valueType, port: 161 };
    } else if (commandType === 'walk') {
      endpoint = `${API_BASE}/api/snmp/walk`;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'SNMP command execution failed');
      
      setResponseLog(data);
    } catch (err: any) {
      setError(err.message || 'Network error communicating with backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-base font-semibold text-white">SNMP Command Console</h2>
              <p className="text-xs text-slate-400">Target: {deviceName} ({deviceId})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Operation Type Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Operation Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['get', 'set', 'walk'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCommandType(type)}
                  className={`py-2 text-xs font-bold uppercase rounded-lg border transition-all ${
                    commandType === type
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-sm'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* OID Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target OID</label>
            <input
              type="text"
              required
              value={oid}
              onChange={(e) => setOid(e.target.value)}
              placeholder="e.g., 1.3.6.1.2.1.1.5.0"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Community String & Type (if SET) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Community String</label>
              <input
                type="text"
                required
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                placeholder={commandType === 'set' ? 'private' : 'public'}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            {commandType === 'set' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Value Type</label>
                <select
                  value={valueType}
                  onChange={(e) => setValueType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="string">String</option>
                  <option value="integer">Integer</option>
                </select>
              </div>
            )}
          </div>

          {/* Value Input if SET */}
          {commandType === 'set' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Value</label>
              <input
                type="text"
                required
                value={setValue}
                onChange={(e) => setSetValue(e.target.value)}
                placeholder="Enter value to write"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Execution Result Log */}
          {(responseLog || error) && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
                {error ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span className="text-rose-400">Execution Error</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Response Data</span>
                  </>
                )}
              </div>
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto max-h-40">
                {error ? error : JSON.stringify(responseLog, null, 2)}
              </pre>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Executing SNMP Command...' : `Execute ${commandType.toUpperCase()} Request`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
