import React from 'react';
import { DeviceTelemetry } from '../types/power.ts';
import { MetricCard } from './MetricCard.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  Zap,
  Battery,
  BatteryCharging,
  Cpu,
  Server,
  Thermometer,
  Activity,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  Check,
  Shield,
  Layers
} from 'lucide-react';

interface DeviceOverviewProps {
  telemetry: DeviceTelemetry[];
  onTriggerLabEvent: (deviceId: string, event: 'toggle_mains' | 'toggle_overload' | 'toggle_temp') => void;
  onNavigateToOutlets: (deviceId?: string) => void;
}

export const DeviceOverview: React.FC<DeviceOverviewProps> = ({
  telemetry,
  onTriggerLabEvent,
  onNavigateToOutlets,
}) => {
  const { theme, mode } = useTheme();

  // Compute aggregate stats across devices
  const upsDevices = telemetry.filter((d) => d.type === 'ups');
  const pduDevices = telemetry.filter((d) => d.type === 'pdu');

  const totalPowerWatts = telemetry.reduce((sum, d) => sum + (d.outputPowerWatts || 0), 0);
  const totalPowerKw = (totalPowerWatts / 1000).toFixed(2);

  const avgInputVolt = telemetry.length
    ? (telemetry.reduce((sum, d) => sum + d.inputVoltage, 0) / telemetry.length).toFixed(1)
    : '120.0';

  const minBatteryRuntime = upsDevices.length
    ? Math.min(...upsDevices.map((d) => d.runtimeRemainingMin ?? 999))
    : null;

  const totalOutlets = telemetry.reduce((sum, d) => sum + d.outlets.length, 0);
  const activeOutlets = telemetry.reduce(
    (sum, d) => sum + d.outlets.filter((o) => o.state === 'on').length,
    0
  );

  return (
    <div className="space-y-6">
      {/* 1. Aggregate Power Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Active Load"
          value={totalPowerKw}
          unit="kW"
          subtext={`${totalPowerWatts.toLocaleString()} Watts aggregate`}
          status={totalPowerWatts > 4500 ? 'warning' : 'normal'}
          icon={<Zap className="w-4 h-4" />}
        />
        <MetricCard
          label="Average Input Line"
          value={avgInputVolt}
          unit="VAC"
          subtext="60.0 Hz nominal frequency"
          status={Number(avgInputVolt) < 110 || Number(avgInputVolt) > 126 ? 'warning' : 'normal'}
          icon={<Activity className="w-4 h-4" />}
        />
        <MetricCard
          label="Min Battery Runtime"
          value={minBatteryRuntime !== null && minBatteryRuntime < 999 ? minBatteryRuntime : '--'}
          unit="min"
          subtext={upsDevices.length > 0 ? `${upsDevices.length} UPS nodes active` : 'No UPS nodes'}
          status={minBatteryRuntime !== null && minBatteryRuntime < 15 ? 'critical' : 'normal'}
          icon={<Battery className="w-4 h-4" />}
        />
        <MetricCard
          label="Switched Outlets"
          value={`${activeOutlets} / ${totalOutlets}`}
          unit="Active"
          subtext={`${totalOutlets - activeOutlets} currently powered down`}
          status="normal"
          icon={<Layers className="w-4 h-4" />}
        />
      </div>

      {/* 2. Device Cards Header */}
      <div className="flex items-center justify-between border-b theme-border pb-3">
        <div>
          <h2 className="text-base font-semibold theme-text-main tracking-tight">Monitored Infrastructure</h2>
          <div className="text-xs theme-text-muted mt-0.5 flex items-center gap-2 font-mono">
            <span>{telemetry.length} Devices Registered</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>Polling UDP:161</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>Rolling Telemetry Buffer</span>
          </div>
        </div>
      </div>

      {/* 3. Device Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {telemetry.map((dev) => {
          const isUPS = dev.type === 'ups';
          const isOverload = dev.outputLoadPct >= 80;
          const isOnBattery = dev.state === 'on_battery';

          const cardBorder = isOnBattery
            ? 'border-amber-500/60 bg-amber-500/10'
            : isOverload
            ? 'border-rose-500/60 bg-rose-500/10'
            : 'theme-card border';

          return (
            <div
              key={dev.id}
              className={`rounded transition-all p-5 flex flex-col justify-between shadow-xs ${cardBorder}`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded ${
                        isUPS
                          ? `${theme.badgeBg} ${theme.accentText}`
                          : 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
                      }`}
                    >
                      {isUPS ? <Server className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold theme-text-main tracking-tight">
                        {dev.name}
                      </h3>
                      <div className="text-xs theme-text-muted font-mono mt-0.5 flex items-center gap-2">
                        <span>{dev.host}:{dev.port}</span>
                        <span aria-hidden="true" className="theme-text-dim">·</span>
                        <span className="uppercase">{dev.type}</span>
                        <span aria-hidden="true" className="theme-text-dim">·</span>
                        <span>{dev.isSimulated ? 'Lab Simulator' : 'Physical SNMP'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-mono font-medium ${
                        isOnBattery
                          ? 'text-amber-500 dark:text-amber-400'
                          : dev.state === 'overload'
                          ? 'text-rose-500 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {dev.state === 'on_battery'
                        ? 'ON BATTERY'
                        : dev.state === 'overload'
                        ? 'OVERLOAD'
                        : 'NOMINAL'}
                    </span>
                    <p className="text-[10px] theme-text-dim font-mono mt-0.5">
                      Updated {new Date(dev.lastPolled).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Primary Metrics Gauges / Progress */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                  {/* Metric 1: Output Load */}
                  <div className="p-2.5 rounded theme-card-subtle border theme-border">
                    <span className="text-[10px] theme-text-dim font-medium uppercase tracking-wider block">
                      Output Load
                    </span>
                    <span className="text-lg font-bold font-mono theme-text-main tabular-nums">
                      {dev.outputLoadPct}%
                    </span>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded mt-1.5 overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, dev.outputLoadPct)}%`,
                          backgroundColor:
                            dev.outputLoadPct > 90
                              ? '#ef4444'
                              : dev.outputLoadPct > 75
                              ? '#f59e0b'
                              : theme.chartPrimary,
                        }}
                      />
                    </div>
                    <span className="text-[10px] theme-text-muted font-mono mt-1 block">
                      {dev.outputPowerWatts} W
                    </span>
                  </div>

                  {/* Metric 2: Input Voltage */}
                  <div className="p-2.5 rounded theme-card-subtle border theme-border">
                    <span className="text-[10px] theme-text-dim font-medium uppercase tracking-wider block">
                      Input Line
                    </span>
                    <span className="text-lg font-bold font-mono theme-text-main tabular-nums">
                      {dev.inputVoltage}
                      <span className="text-xs theme-text-muted font-normal ml-0.5">V</span>
                    </span>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded mt-1.5 overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (dev.inputVoltage / 130) * 100)}%`,
                          backgroundColor:
                            dev.inputVoltage === 0
                              ? '#ef4444'
                              : dev.inputVoltage < 110
                              ? '#f59e0b'
                              : '#10b981',
                        }}
                      />
                    </div>
                    <span className="text-[10px] theme-text-muted font-mono mt-1 block">
                      {dev.inputFrequency} Hz
                    </span>
                  </div>

                  {/* Metric 3: Current Draw */}
                  <div className="p-2.5 rounded theme-card-subtle border theme-border">
                    <span className="text-[10px] theme-text-dim font-medium uppercase tracking-wider block">
                      Current Draw
                    </span>
                    <span className="text-lg font-bold font-mono theme-text-main tabular-nums">
                      {dev.outputCurrentAmps}
                      <span className="text-xs theme-text-muted font-normal ml-0.5">A</span>
                    </span>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (dev.outputCurrentAmps / (dev.ratedAmps || 16)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] theme-text-muted font-mono mt-1 block">
                      Rated: {dev.ratedAmps || 16}A Max
                    </span>
                  </div>

                  {/* Metric 4: Battery or Temperature */}
                  <div className="p-2.5 rounded theme-card-subtle border theme-border">
                    <span className="text-[10px] theme-text-dim font-medium uppercase tracking-wider block">
                      {isUPS ? 'Battery State' : 'Internal Sensor'}
                    </span>
                    <span className="text-lg font-bold font-mono theme-text-main tabular-nums">
                      {isUPS
                        ? `${dev.batteryPct}%`
                        : `${dev.batteryTempCelsius || 24}°C`}
                    </span>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded mt-1.5 overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${isUPS ? dev.batteryPct || 100 : 70}%`,
                          backgroundColor: isUPS
                            ? dev.batteryPct && dev.batteryPct < 20
                              ? '#ef4444'
                              : dev.batteryPct && dev.batteryPct < 50
                              ? '#f59e0b'
                              : '#10b981'
                            : theme.chartPrimary,
                        }}
                      />
                    </div>
                    <span className="text-[10px] theme-text-muted font-mono mt-1 block">
                      {isUPS
                        ? `${dev.runtimeRemainingMin ?? '--'}m runtime`
                        : `${dev.outlets.length} Outlets`}
                    </span>
                  </div>
                </div>

                {/* Switched Outlets Strip (if device has outlets) */}
                {dev.outlets.length > 0 && (
                  <div className="border-t theme-border pt-3">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="theme-text-muted font-medium">
                        Switched Outlets ({dev.outlets.filter((o) => o.state === 'on').length}/{dev.outlets.length} Powered)
                      </span>
                      <button
                        onClick={() => onNavigateToOutlets(dev.id)}
                        className={`font-medium transition-colors cursor-pointer ${theme.accentText} hover:opacity-80`}
                      >
                        Manage Outlets →
                      </button>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                      {dev.outlets.map((o) => (
                        <div
                          key={o.index}
                          title={`${o.name} (${o.equipment || 'Unassigned'}) - ${o.state.toUpperCase()}`}
                          className={`p-1 rounded text-center font-mono text-[11px] border cursor-pointer transition-colors ${
                            o.state === 'on'
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                              : o.state === 'rebooting'
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 animate-pulse'
                              : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                          }`}
                          onClick={() => onNavigateToOutlets(dev.id)}
                        >
                          <div className="text-[9px] theme-text-dim">#{o.index}</div>
                          <div className="font-bold">{o.state === 'on' ? 'ON' : o.state === 'rebooting' ? 'CYC' : 'OFF'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lab simulation action buttons footer */}
              <div className="border-t theme-border pt-3 mt-4 flex items-center justify-between gap-2 text-xs">
                <span className="text-[11px] theme-text-dim font-mono">
                  Diagnostics & Test Triggers:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onTriggerLabEvent(dev.id, 'toggle_mains')}
                    title="Simulate loss of line voltage to test alarm triggers"
                    className={`px-2 py-1 rounded font-mono text-[11px] border transition-colors cursor-pointer ${
                      isOnBattery
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-200'
                        : 'theme-card border theme-border theme-text-muted hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isOnBattery ? 'Restore Line VAC' : 'Simulate Outage'}
                  </button>
                  <button
                    onClick={() => onTriggerLabEvent(dev.id, 'toggle_overload')}
                    title="Simulate load exceeding 95% to test overload breaker warning"
                    className={`px-2 py-1 rounded font-mono text-[11px] border transition-colors cursor-pointer ${
                      isOverload
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-700 dark:text-rose-200'
                        : 'theme-card border theme-border theme-text-muted hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isOverload ? 'Normalize Load' : 'Test Overload'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
