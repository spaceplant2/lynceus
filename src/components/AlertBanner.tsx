import React from 'react';
import { DashboardAlert } from '../types/power.ts';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';

interface AlertBannerProps {
  alerts: DashboardAlert[];
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alerts,
  drawerOpen,
  setDrawerOpen,
  onAcknowledge,
  onDismiss,
  onClearAll,
}) => {
  const { theme, mode } = useTheme();
  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const critical = activeAlerts.filter((a) => a.severity === 'critical');
  const topAlert = critical[0] || activeAlerts[0];

  return (
    <>
      {/* Persistent Alert Banner if there are active unacknowledged alerts */}
      {topAlert && (
        <div
          className={`border-b px-4 py-2 text-xs flex items-center justify-between gap-4 transition-colors ${
            topAlert.severity === 'critical'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-800 dark:text-rose-200'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
            {topAlert.severity === 'critical' ? (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span className="font-semibold uppercase tracking-wider shrink-0 font-mono">
              [{topAlert.severity}]
            </span>
            <span className="font-medium shrink-0 theme-text-main">{topAlert.title}:</span>
            <span className="truncate">{topAlert.message}</span>
            <span className="theme-text-dim shrink-0 font-mono">({topAlert.deviceName})</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onAcknowledge(topAlert.id)}
              className="px-2 py-0.5 rounded bg-black/10 dark:bg-black/40 hover:bg-black/20 dark:hover:bg-black/60 theme-text-main transition-colors cursor-pointer"
            >
              Acknowledge
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="underline theme-text-main hover:opacity-80 ml-1 cursor-pointer"
            >
              View all ({activeAlerts.length})
            </button>
          </div>
        </div>
      )}

      {/* Slide-out or Modal Alert Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-md theme-card border-l theme-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b theme-border flex items-center justify-between theme-header">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: theme.previewHex }} />
                <h2 className="text-sm font-semibold theme-text-main">System Alerts Log</h2>
                <span className="text-xs theme-text-dim font-mono">({alerts.length})</span>
              </div>
              <div className="flex items-center gap-2">
                {alerts.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="text-xs theme-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded theme-text-muted hover:theme-text-main hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Alert List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center theme-text-dim text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mb-2" />
                  <p className="theme-text-main font-medium">All power systems nominal.</p>
                  <p className="theme-text-muted mt-1">No active SNMP alerts or threshold violations.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded border text-xs transition-colors ${
                      alert.severity === 'critical'
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : alert.severity === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'theme-card-subtle theme-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        {alert.severity === 'critical' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : alert.severity === 'warning' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <Info className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        )}
                        <span className="theme-text-main font-semibold">{alert.title}</span>
                      </div>
                      <span className="font-mono text-[11px] theme-text-dim">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="theme-text-muted mb-2 leading-relaxed">{alert.message}</p>

                    <div className="flex items-center justify-between text-[11px] border-t theme-border pt-2">
                      <span className="theme-text-dim font-mono">{alert.deviceName}</span>
                      <div className="flex items-center gap-2">
                        {!alert.acknowledged && (
                          <button
                            onClick={() => onAcknowledge(alert.id)}
                            className="px-2 py-0.5 rounded border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 theme-text-main cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => onDismiss(alert.id)}
                          className="theme-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer with hint */}
            <div className="p-3 border-t theme-border theme-card-subtle text-xs theme-text-dim flex items-center justify-between">
              <span>Thresholds configurable in YAML</span>
              <span className="font-mono">In-Memory Buffer</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
