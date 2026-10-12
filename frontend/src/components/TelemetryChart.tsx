// frontend/src/components/TelemetryChart.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { DeviceTelemetryResponse } from '@/hooks/useDeviceTelemetry';
import { Activity } from 'lucide-react';

interface TelemetryChartProps {
  devices: DeviceTelemetryResponse[];
}

interface ChartDataPoint {
  time: string;
  [key: string]: any;
}

export function TelemetryChart({ devices }: TelemetryChartProps) {
  const [history, setHistory] = useState<ChartDataPoint[]>([]);

  // Append incoming device telemetry points to the sliding history window (max 20 points)
  useEffect(() => {
    if (!devices || devices.length === 0) return;

    const now = new Date().toLocaleTimeString();
    
    setHistory((prev) => {
      const newPoint: ChartDataPoint = { time: now };
      
      devices.forEach((d) => {
        if (d.metrics.output_load_percent !== undefined) {
          newPoint[`${d.name} Load (%)`] = d.metrics.output_load_percent;
        }
        if (d.metrics.input_voltage !== undefined) {
          newPoint[`${d.name} Voltage (V)`] = d.metrics.input_voltage;
        }
      });

      const updated = [...prev, newPoint];
      // Keep only the last 20 data points for a smooth rolling window
      if (updated.length > 20) updated.shift();
      return updated;
    });
  }, [devices]);

  if (history.length === 0) {
    return (
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 shadow-xl flex items-center justify-center text-slate-400 h-72">
        Awaiting telemetry data stream for charting...
      </div>
    );
  }

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Real-Time Power & Load Trends
        </h2>
        <span className="text-xs text-slate-400 font-mono">Live Rolling Window (20 ticks)</span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
              labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            
            {/* Dynamically plot lines based on available device telemetry keys */}
            {devices.map((device, idx) => {
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
              const color = colors[idx % colors.length];

              return (
                <React.Fragment key={device.device_id}>
                  {device.metrics.output_load_percent !== undefined && (
                    <Line
                      type="monotone"
                      dataKey={`${device.name} Load (%)`}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
