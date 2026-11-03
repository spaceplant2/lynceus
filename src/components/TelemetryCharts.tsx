import React, { useState } from 'react';
import { DeviceTelemetry, MetricDataPoint } from '../types/power.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { Activity, Zap, Battery, Clock } from 'lucide-react';

interface TelemetryChartsProps {
  telemetry: DeviceTelemetry[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ telemetry }) => {
  const { theme, mode } = useTheme();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    telemetry[0]?.id || ''
  );
  const [selectedMetric, setSelectedMetric] = useState<'load' | 'voltage' | 'battery' | 'current'>('load');

  const activeDevice = telemetry.find((d) => d.id === selectedDeviceId) || telemetry[0];

  if (!activeDevice) {
    return (
      <div className="p-8 text-center theme-text-dim text-xs border border-dashed theme-border rounded">
        No device telemetry available.
      </div>
    );
  }

  const history = activeDevice.history || [];

  // Metric extraction helper with theme-aware dynamic chart colors
  const getMetricDetails = () => {
    switch (selectedMetric) {
      case 'load':
        return {
          title: 'Output Load & Active Power',
          unit: '%',
          getValue: (p: MetricDataPoint) => p.outputLoadPct ?? 0,
          secondaryVal: (p: MetricDataPoint) => p.outputPowerWatts,
          secondaryUnit: 'W',
          minY: 0,
          maxY: 100,
          color: theme.chartPrimary,
          warningLine: 80,
          criticalLine: 95,
        };
      case 'voltage':
        return {
          title: 'Input Line Voltage',
          unit: 'V',
          getValue: (p: MetricDataPoint) => p.inputVoltage,
          minY: 80,
          maxY: 140,
          color: theme.chartSecondary,
          warningLine: 108,
          criticalLine: 128,
        };
      case 'battery':
        return {
          title: 'Battery Charge & Estimated Runtime',
          unit: '%',
          getValue: (p: MetricDataPoint) => p.batteryPct ?? 0,
          secondaryVal: (p: MetricDataPoint) => p.runtimeMin,
          secondaryUnit: 'min',
          minY: 0,
          maxY: 100,
          color: theme.chartTertiary,
          warningLine: 25,
          criticalLine: 10,
        };
      case 'current':
        return {
          title: 'Current Draw (Amperes)',
          unit: 'A',
          getValue: (p: MetricDataPoint) => p.currentAmps ?? 0,
          minY: 0,
          maxY: (activeDevice.ratedAmps || 16) + 4,
          color: mode === 'dark' ? '#fbbf24' : '#d97706',
          warningLine: (activeDevice.ratedAmps || 16) * 0.8,
          criticalLine: activeDevice.ratedAmps || 16,
        };
    }
  };

  const config = getMetricDetails();
  const values = history.map(config.getValue);
  const minVal = values.length ? Math.min(...values).toFixed(1) : '0';
  const maxVal = values.length ? Math.max(...values).toFixed(1) : '0';
  const curVal = values.length ? values[values.length - 1].toFixed(1) : '0';
  const avgVal = values.length
    ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
    : '0';

  // SVG Chart Dimensions
  const width = 800;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const points = history.map((pt, index) => {
    const x =
      padding.left +
      (history.length > 1 ? (index / (history.length - 1)) * innerWidth : innerWidth / 2);
    const val = config.getValue(pt);
    const clamped = Math.max(config.minY, Math.min(config.maxY, val));
    const y =
      padding.top +
      innerHeight -
      ((clamped - config.minY) / (config.maxY - config.minY)) * innerHeight;
    return { x, y, val, timestamp: pt.timestamp };
  });

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaStr =
    points.length > 1
      ? `${polylineStr} ${points[points.length - 1].x.toFixed(1)},${(padding.top + innerHeight).toFixed(1)} ${points[0].x.toFixed(1)},${(padding.top + innerHeight).toFixed(1)}`
      : '';

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
        <div>
          <h2 className="text-base font-semibold theme-text-main tracking-tight">Real-Time Telemetry Roll</h2>
          <div className="text-xs theme-text-muted mt-0.5 flex items-center gap-2 font-mono">
            <span>In-Memory Ring Buffer ({history.length} samples)</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>Polling Interval: {activeDevice.pollIntervalSec || 3}s</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>Short-Lived Ephemeral Storage</span>
          </div>
        </div>

        {/* Device selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs theme-text-muted">Target Node:</span>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="theme-input border rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none cursor-pointer"
          >
            {telemetry.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.type.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Metric Selector Tabs */}
      <div className="flex items-center gap-1 p-1 theme-card-subtle border theme-border rounded">
        {[
          { id: 'load', label: 'Output Load (%)', icon: <Zap className="w-3.5 h-3.5" /> },
          { id: 'voltage', label: 'Input Voltage (V)', icon: <Activity className="w-3.5 h-3.5" /> },
          ...(activeDevice.type === 'ups'
            ? [{ id: 'battery', label: 'Battery Runtime', icon: <Battery className="w-3.5 h-3.5" /> }]
            : []),
          { id: 'current', label: 'Current Draw (A)', icon: <Clock className="w-3.5 h-3.5" /> },
        ].map((tab) => {
          const isActive = selectedMetric === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedMetric(tab.id as typeof selectedMetric)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? `${theme.badgeBg} ${theme.badgeText} shadow-xs font-semibold`
                  : 'theme-text-muted hover:theme-text-main hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Chart Display Card */}
      <div className="theme-card border rounded p-5 shadow-xs">
        {/* Metric summary numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 border-b theme-border pb-4">
          <div>
            <span className="text-[10px] uppercase font-mono theme-text-dim block">Current</span>
            <span className="text-xl font-bold font-mono theme-text-main tabular-nums">
              {curVal} {config.unit}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono theme-text-dim block">Rolling Average</span>
            <span className="text-xl font-bold font-mono theme-text-muted tabular-nums">
              {avgVal} {config.unit}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono theme-text-dim block">Peak Max</span>
            <span className="text-xl font-bold font-mono theme-text-muted tabular-nums">
              {maxVal} {config.unit}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono theme-text-dim block">Minimum</span>
            <span className="text-xl font-bold font-mono theme-text-muted tabular-nums">
              {minVal} {config.unit}
            </span>
          </div>
        </div>

        {/* SVG Time Series Chart */}
        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const yVal = padding.top + innerHeight * (1 - pct);
              const labelVal = (config.minY + pct * (config.maxY - config.minY)).toFixed(0);
              return (
                <g key={idx}>
                  <line
                    x1={padding.left}
                    y1={yVal}
                    x2={width - padding.right}
                    y2={yVal}
                    stroke={mode === 'dark' ? '#1e293b' : '#e2e8f0'}
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 8}
                    y={yVal + 3}
                    textAnchor="end"
                    fill={mode === 'dark' ? '#64748b' : '#94a3b8'}
                    className="font-mono text-[10px]"
                  >
                    {labelVal}
                  </text>
                </g>
              );
            })}

            {/* Warning threshold dotted line if configured */}
            {config.warningLine && config.warningLine <= config.maxY && (
              <g>
                <line
                  x1={padding.left}
                  y1={
                    padding.top +
                    innerHeight -
                    ((config.warningLine - config.minY) / (config.maxY - config.minY)) *
                      innerHeight
                  }
                  x2={width - padding.right}
                  y2={
                    padding.top +
                    innerHeight -
                    ((config.warningLine - config.minY) / (config.maxY - config.minY)) *
                      innerHeight
                  }
                  stroke="#d97706"
                  strokeDasharray="4 2"
                  strokeWidth="1.2"
                />
                <text
                  x={width - padding.right}
                  y={
                    padding.top +
                    innerHeight -
                    ((config.warningLine - config.minY) / (config.maxY - config.minY)) *
                      innerHeight -
                    4
                  }
                  textAnchor="end"
                  fill="#d97706"
                  className="font-mono text-[9px]"
                >
                  Warning Limit ({config.warningLine})
                </text>
              </g>
            )}

            {/* Filled Area Gradient */}
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.color} stopOpacity={mode === 'dark' ? '0.3' : '0.2'} />
                <stop offset="100%" stopColor={config.color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {areaStr && <polygon points={areaStr} fill="url(#chartGradient)" />}

            {/* Polyline */}
            {polylineStr && (
              <polyline
                fill="none"
                stroke={config.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylineStr}
              />
            )}

            {/* Latest point pulse */}
            {points.length > 0 && (
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="4"
                fill={config.color}
                className="animate-pulse"
              />
            )}

            {/* Time labels on X Axis */}
            {points.length > 1 && (
              <>
                <text
                  x={padding.left}
                  y={height - 6}
                  textAnchor="start"
                  fill={mode === 'dark' ? '#64748b' : '#94a3b8'}
                  className="font-mono text-[10px]"
                >
                  {new Date(points[0].timestamp).toLocaleTimeString([], {
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </text>
                <text
                  x={width - padding.right}
                  y={height - 6}
                  textAnchor="end"
                  fill={mode === 'dark' ? '#64748b' : '#94a3b8'}
                  className="font-mono text-[10px]"
                >
                  Live (
                  {new Date(points[points.length - 1].timestamp).toLocaleTimeString([], {
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                  )
                </text>
              </>
            )}
          </svg>
        </div>
      </div>

      {/* 4. Tabular Figures Snapshot Log */}
      <div className="theme-card border rounded overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b theme-border theme-card-subtle flex items-center justify-between">
          <span className="text-xs font-semibold theme-text-main font-mono">
            Recent Telemetry Frames ({history.slice(-10).length} shown)
          </span>
          <span className="text-[11px] theme-text-dim font-mono">
            Auto-purges older than 30m
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b theme-border theme-text-dim text-[10px] theme-card-subtle">
                <th className="py-2 px-4">Timestamp</th>
                <th className="py-2 px-4 text-right">Input VAC</th>
                <th className="py-2 px-4 text-right">Load %</th>
                <th className="py-2 px-4 text-right">Power (Watts)</th>
                <th className="py-2 px-4 text-right">Current (Amps)</th>
                {activeDevice.type === 'ups' && (
                  <>
                    <th className="py-2 px-4 text-right">Battery %</th>
                    <th className="py-2 px-4 text-right">Runtime (min)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y theme-border tabular-nums theme-text-muted">
              {history
                .slice(-8)
                .reverse()
                .map((pt, i) => (
                  <tr key={i} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-2 px-4 theme-text-dim">
                      {new Date(pt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-4 text-right">{pt.inputVoltage} V</td>
                    <td className="py-2 px-4 text-right">{pt.outputLoadPct ?? '--'}%</td>
                    <td className="py-2 px-4 text-right">{pt.outputPowerWatts ?? '--'} W</td>
                    <td className="py-2 px-4 text-right">{pt.currentAmps ?? '--'} A</td>
                    {activeDevice.type === 'ups' && (
                      <>
                        <td className="py-2 px-4 text-right">{pt.batteryPct ?? '--'}%</td>
                        <td className="py-2 px-4 text-right">{pt.runtimeMin ?? '--'}m</td>
                      </>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
