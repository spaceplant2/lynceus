// frontend/src/components/DeviceCard.tsx
'use client';

import React, { useState } from 'react';
import { DeviceTelemetryResponse } from '@/hooks/useDeviceTelemetry';
import { Terminal, Activity, Zap, Shield, Play } from 'lucide-react';

interface DeviceCardProps {
  device: DeviceTelemetryResponse;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function DeviceCard({ device }: DeviceCardProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandOutput, setCommandOutput] = useState<string | null>(null);

  // Example interactive SNMP OID test trigger (e.g., querying sysName or battery status)
  const handleRunSnmpGet = async () => {
    setIsExecuting(true);
    setCommandOutput(null);

    try {
      const response = await fetch(`${API_BASE}/api/snmp/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: device.device_id, // or device.host if stored in config
          community: 'public',
          oid: '1.3.6.1.2.1.1.5.0', // standard sysName OID example
          port: 161,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'SNMP GET failed');
      
      setCommandOutput(`Success: ${JSON.stringify(result.data)}`);
    } catch (err: any) {
      setCommandOutput(`Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 shadow-xl relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
      <div>
        {/* Device Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              {device.name}
            </h3>
            <p className="text-xs text-slate-400">ID: {device.device_id} | Proto: {device.protocol}</p>
          </div>
          <span
            className={`px-2 py-0.5 text-[10px] rounded uppercase font-bold tracking-wider ${
              device.status === 'normal'
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
            }`}
          >
            {device.status}
          </span>
        </div>

        {/* Metrics Breakdown */}
        <div className="space-y-3 text-sm mb-4">
          {device.metrics.battery_charge_percent !== undefined && (
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Battery Level</span>
                <span className="font-mono">{device.metrics.battery_charge_percent}%</span>
              </div>
              <div className="w-full bg-slate-700/60 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${device.metrics.battery_charge_percent}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/40 text-xs font-mono">
            {device.metrics.output_load_percent !== undefined && (
              <div className="bg-slate-900/40 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Load</span>
                <span className="text-slate-200 font-medium">
                  {device.metrics.output_load_percent}%
                </span>
              </div>
            )}
            {device.metrics.output_power_watts !== undefined && (
              <div className="bg-slate-900/40 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Power Out</span>
                <span className="text-slate-200 font-medium">
                  {device.metrics.output_power_watts} W
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Interactive SNMP Command Console drawer */}
        <div className="pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              SNMP Action Trigger
            </span>
            <button
              onClick={handleRunSnmpGet}
              disabled={isExecuting}
              className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-medium rounded transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isExecuting ? "Polling OID..." : "Test GET OID"}</span>
            </button>
          </div>

          {commandOutput && (
            <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 text-[11px] font-mono text-emerald-400 break-all">
              {commandOutput}
            </div>
          )}
        </div>
      </div>

      {/* Timestamp Footer */}
      {device.metrics.timestamp && (
        <div className="mt-4 pt-3 border-t border-slate-700/30 text-[10px] text-slate-500 text-right font-mono">
          Updated: {new Date(device.metrics.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}