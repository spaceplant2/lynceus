import React from 'react';
import StatusBadge from './StatusBadge';

export default function PowerCard({ device }) {
  const { name, device_type, protocol, status, metrics, outlets } = device;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-lg flex flex-col justify-between">
      {/* Card Header */}
      <div>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">{name}</h3>
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              {device_type} • {protocol}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 my-4 bg-slate-900/50 p-3 rounded border border-slate-700/50">
          <div>
            <span className="text-xs text-slate-400 block">Input Voltage</span>
            <span className="text-sm font-mono text-slate-200">
              {metrics?.input_voltage != null ? `${metrics.input_voltage} V` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Output Voltage</span>
            <span className="text-sm font-mono text-slate-200">
              {metrics?.output_voltage != null ? `${metrics.output_voltage} V` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Current Draw</span>
            <span className="text-sm font-mono text-slate-200">
              {metrics?.current_draw_amps != null ? `${metrics.current_draw_amps} A` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Power Load</span>
            <span className="text-sm font-mono text-slate-200">
              {metrics?.power_watts != null ? `${metrics.power_watts} W` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Battery Bar (If UPS or applicable) */}
        {metrics?.battery_charge_percent != null && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Battery Charge</span>
              <span className="font-mono text-slate-200">{metrics.battery_charge_percent}%</span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, metrics.battery_charge_percent))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Outlets Footer */}
      {outlets && outlets.length > 0 && (
        <div className="pt-3 border-t border-slate-700/50">
          <span className="text-xs text-slate-400 block mb-2">Outlets ({outlets.length})</span>
          <div className="flex flex-wrap gap-1.5">
            {outlets.map((outlet) => (
              <span
                key={outlet.id}
                className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  outlet.state === 'ON'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {outlet.name || `Outlet ${outlet.id}`}: {outlet.state}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
