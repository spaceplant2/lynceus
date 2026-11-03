import React from 'react';
import { useTheme } from '../context/ThemeContext.tsx';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  status?: 'normal' | 'warning' | 'critical' | 'muted';
  sparklineData?: number[];
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  status = 'normal',
  sparklineData,
  icon,
}) => {
  const { theme, mode } = useTheme();

  const statusColors = {
    normal: 'theme-card border shadow-xs',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 shadow-xs',
    critical: 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300 shadow-xs',
    muted: 'theme-card border opacity-75 theme-text-muted shadow-xs',
  };

  const getAccentColor = () => {
    switch (status) {
      case 'warning':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
      case 'muted':
        return mode === 'dark' ? '#64748b' : '#94a3b8';
      default:
        return theme.chartPrimary;
    }
  };

  return (
    <div className={`p-4 rounded transition-all ${statusColors[status]}`}>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium tracking-wide uppercase text-[11px] theme-text-muted">{label}</span>
        {icon && <span style={{ color: getAccentColor() }} className="shrink-0">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-bold font-mono tracking-tight tabular-nums theme-text-main">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-mono font-medium theme-text-muted shrink-0">
            {unit}
          </span>
        )}
      </div>

      {subtext && (
        <div className="mt-2 text-xs theme-text-muted flex items-center gap-1 font-mono">
          <span>{subtext}</span>
        </div>
      )}

      {sparklineData && sparklineData.length > 2 && (
        <div className="mt-2 h-7 w-full overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
            {(() => {
              const min = Math.min(...sparklineData);
              const max = Math.max(...sparklineData);
              const range = max - min || 1;
              const points = sparklineData
                .map((d, i) => {
                  const x = (i / (sparklineData.length - 1)) * 100;
                  const y = 22 - ((d - min) / range) * 20;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(' ');
              return (
                <polyline
                  fill="none"
                  stroke={getAccentColor()}
                  strokeWidth="1.5"
                  strokeOpacity={status === 'normal' ? '0.85' : '1'}
                  points={points}
                />
              );
            })()}
          </svg>
        </div>
      )}
    </div>
  );
};
