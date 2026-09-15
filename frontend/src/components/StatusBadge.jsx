import React from 'react';

const STATUS_COLORS = {
  NORMAL: 'bg-green-500/10 text-green-400 border-green-500/20',
  ON_BATTERY: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  LOW_BATTERY: 'bg-red-500/10 text-red-400 border-red-500/20',
  BYPASS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  OVERLOAD: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  OFFLINE: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export default function StatusBadge({ status }) {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.OFFLINE;

  return (
    <span className={`px-2 py-0.5 text-xs font-mono rounded border ${colorClass}`}>
      {status || 'UNKNOWN'}
    </span>
  );
}
