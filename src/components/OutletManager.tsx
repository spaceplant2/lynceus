import React, { useState } from 'react';
import { DeviceTelemetry, OutletStatus } from '../types/power.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  Power,
  RotateCcw,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
  Filter
} from 'lucide-react';

interface OutletManagerProps {
  telemetry: DeviceTelemetry[];
  selectedDeviceId?: string;
  onControlOutlet: (
    deviceId: string,
    outletIndex: number,
    action: 'on' | 'off' | 'reboot',
    delaySec?: number
  ) => Promise<{ success: boolean; message: string }>;
}

export const OutletManager: React.FC<OutletManagerProps> = ({
  telemetry,
  selectedDeviceId,
  onControlOutlet,
}) => {
  const { theme } = useTheme();
  const [deviceFilter, setDeviceFilter] = useState<string>(selectedDeviceId || 'all');
  const [safetyOverrideChecked, setSafetyOverrideChecked] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<{
    device: DeviceTelemetry;
    outlet: OutletStatus;
    action: 'on' | 'off' | 'reboot';
    delaySec: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const devicesWithOutlets = telemetry.filter((d) => d.outlets && d.outlets.length > 0);
  const activeDeviceList =
    deviceFilter === 'all'
      ? devicesWithOutlets
      : devicesWithOutlets.filter((d) => d.id === deviceFilter);

  const handleActionClick = (
    device: DeviceTelemetry,
    outlet: OutletStatus,
    action: 'on' | 'off' | 'reboot'
  ) => {
    // If critical locked or if turning OFF or REBOOTING, always show confirmation modal
    setSafetyOverrideChecked(false);
    setPendingAction({
      device,
      outlet,
      action,
      delaySec: outlet.rebootDelaySec || 10,
    });
  };

  const executeConfirmedAction = async () => {
    if (!pendingAction) return;
    setIsSubmitting(true);
    setActionFeedback(null);

    const res = await onControlOutlet(
      pendingAction.device.id,
      pendingAction.outlet.index,
      pendingAction.action,
      pendingAction.delaySec
    );

    setIsSubmitting(false);
    if (res.success) {
      setActionFeedback({ type: 'success', message: res.message });
      setPendingAction(null);
    } else {
      setActionFeedback({ type: 'error', message: res.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
        <div>
          <h2 className="text-base font-semibold theme-text-main tracking-tight">Remote Outlet Management</h2>
          <div className="text-xs theme-text-muted mt-0.5 flex items-center gap-2 font-mono">
            <span>Switched Rack PDUs & UPS Banks</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>SNMP SET Execution</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>Safety Interlock Protection</span>
          </div>
        </div>

        {/* Device selector */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 theme-text-muted" />
          <span className="text-xs theme-text-muted">Filter Device:</span>
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="theme-input border rounded text-xs px-2.5 py-1.5 focus:outline-none font-mono cursor-pointer"
          >
            <option value="all">All Devices ({devicesWithOutlets.length})</option>
            {devicesWithOutlets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.outlets.length} outlets)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Global feedback message */}
      {actionFeedback && (
        <div
          className={`p-3 rounded text-xs flex items-center justify-between border ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="theme-text-muted hover:theme-text-main text-xs underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Device Outlet Lists */}
      {activeDeviceList.length === 0 ? (
        <div className="p-12 text-center border border-dashed theme-border rounded theme-text-dim text-xs">
          No devices with manageable switched outlets found. Check your YAML configuration to add outlet mappings.
        </div>
      ) : (
        activeDeviceList.map((dev) => (
          <div key={dev.id} className="theme-card border rounded overflow-hidden shadow-xs">
            {/* Device Header */}
            <div className="px-5 py-3 border-b theme-border theme-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm theme-text-main">{dev.name}</span>
                <span className="text-xs theme-text-muted font-mono">({dev.host}:{dev.port})</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono theme-text-muted">
                <span>Total Outlets: {dev.outlets.length}</span>
                <span aria-hidden="true" className="theme-text-dim">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {dev.outlets.filter((o) => o.state === 'on').length} Powered
                </span>
                <span aria-hidden="true" className="theme-text-dim">·</span>
                <span>
                  Load: {dev.outputCurrentAmps}A ({dev.outputPowerWatts}W)
                </span>
              </div>
            </div>

            {/* Outlets Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b theme-border theme-text-dim font-mono uppercase text-[10px] theme-card-subtle">
                    <th className="py-2.5 px-4 w-14">Outlet</th>
                    <th className="py-2.5 px-4">Label & Connected Equipment</th>
                    <th className="py-2.5 px-4 w-32">Status</th>
                    <th className="py-2.5 px-4 w-28 text-right">Power Draw</th>
                    <th className="py-2.5 px-4 w-28 text-center">Safety Lock</th>
                    <th className="py-2.5 px-4 w-60 text-right">SNMP Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border font-sans">
                  {dev.outlets.map((outlet) => {
                    const isRebooting = outlet.state === 'rebooting';
                    const isOn = outlet.state === 'on';

                    return (
                      <tr
                        key={outlet.index}
                        className="hover:bg-slate-100/60 dark:hover:bg-slate-800/30 transition-colors group"
                      >
                        {/* Index */}
                        <td className="py-3 px-4 font-mono font-medium theme-text-muted">
                          #{outlet.index}
                        </td>

                        {/* Name & Equipment */}
                        <td className="py-3 px-4">
                          <div className="font-medium theme-text-main">{outlet.name}</div>
                          <div className="text-[11px] theme-text-muted font-mono mt-0.5">
                            {outlet.equipment || 'General Purpose'}
                          </div>
                        </td>

                        {/* State */}
                        <td className="py-3 px-4">
                          {isRebooting ? (
                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono font-medium animate-pulse">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>REBOOTING ({outlet.countdownSec || 0}s)</span>
                            </div>
                          ) : isOn ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                              <span>POWERED ON</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 theme-text-dim font-mono font-medium">
                              <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600 inline-block" />
                              <span>POWERED OFF</span>
                            </div>
                          )}
                        </td>

                        {/* Power Draw */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums theme-text-main">
                          {isOn ? (
                            <div>
                              <span>{outlet.currentAmps ?? 0} A</span>
                              <div className="text-[10px] theme-text-dim">
                                {outlet.powerWatts ?? 0} W
                              </div>
                            </div>
                          ) : (
                            <span className="theme-text-dim">0.0 A</span>
                          )}
                        </td>

                        {/* Safety Lock */}
                        <td className="py-3 px-4 text-center">
                          {outlet.isCriticalLocked ? (
                            <span
                              title="Critical hardware lock active. Requires confirmation before power cut."
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-mono"
                            >
                              <Lock className="w-3 h-3 text-rose-500" />
                              <span>LOCKED</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono theme-text-dim">
                              Unlocked
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Power Cycle / Reboot button */}
                            <button
                              disabled={isRebooting || !isOn}
                              onClick={() => handleActionClick(dev, outlet, 'reboot')}
                              title={
                                !isOn
                                  ? 'Outlet is powered off. Power ON first.'
                                  : 'Reboot outlet with delayed power restoration'
                              }
                              className={`px-2 py-1 rounded text-xs font-mono font-medium border transition-colors flex items-center gap-1 cursor-pointer ${
                                !isOn || isRebooting
                                  ? 'opacity-30 cursor-not-allowed border-transparent theme-text-dim'
                                  : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
                              }`}
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reboot</span>
                            </button>

                            {/* Power Switch (ON/OFF) */}
                            {isOn ? (
                              <button
                                disabled={isRebooting}
                                onClick={() => handleActionClick(dev, outlet, 'off')}
                                className="px-2 py-1 rounded text-xs font-mono font-medium border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Power className="w-3 h-3" />
                                <span>Turn Off</span>
                              </button>
                            ) : (
                              <button
                                disabled={isRebooting}
                                onClick={() => handleActionClick(dev, outlet, 'on')}
                                className="px-2 py-1 rounded text-xs font-mono font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Power className="w-3 h-3" />
                                <span>Turn On</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* 3. Safety Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md theme-card border rounded-lg shadow-2xl p-6 theme-text-main animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold theme-text-main">
                  Confirm Outlet Remote Control
                </h3>
                <span className="text-xs theme-text-muted font-mono">
                  SNMP Command Execution
                </span>
              </div>
            </div>

            {/* Target details */}
            <div className="p-3 theme-card-subtle rounded border theme-border space-y-1.5 text-xs font-mono mb-4">
              <div className="flex justify-between">
                <span className="theme-text-muted">Target Device:</span>
                <span className="font-bold theme-text-main">{pendingAction.device.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="theme-text-muted">Outlet:</span>
                <span className="theme-text-main">
                  #{pendingAction.outlet.index} - {pendingAction.outlet.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="theme-text-muted">Connected Gear:</span>
                <span className="theme-text-main">{pendingAction.outlet.equipment || 'General Purpose'}</span>
              </div>
              <div className="flex justify-between">
                <span className="theme-text-muted">Requested Action:</span>
                <span
                  className={`font-bold ${
                    pendingAction.action === 'off'
                      ? 'text-rose-600 dark:text-rose-400'
                      : pendingAction.action === 'reboot'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {pendingAction.action.toUpperCase()}
                  {pendingAction.action === 'reboot' ? ` (${pendingAction.delaySec}s delay)` : ''}
                </span>
              </div>
            </div>

            {/* Delay adjustment for reboot */}
            {pendingAction.action === 'reboot' && (
              <div className="mb-4 text-xs">
                <label className="theme-text-muted block mb-1">
                  Reboot Delay Duration (seconds before power restore):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={pendingAction.delaySec}
                    onChange={(e) =>
                      setPendingAction({
                        ...pendingAction,
                        delaySec: parseInt(e.target.value, 10),
                      })
                    }
                    className="flex-1 cursor-pointer"
                    style={{ accentColor: theme.previewHex }}
                  />
                  <span className="font-mono theme-text-main text-xs w-12 text-right">
                    {pendingAction.delaySec}s
                  </span>
                </div>
              </div>
            )}

            {/* Safety Interlock Checkbox */}
            {pendingAction.outlet.isCriticalLocked && pendingAction.action !== 'on' && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded mb-4">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="safety-interlock"
                    checked={safetyOverrideChecked}
                    onChange={(e) => setSafetyOverrideChecked(e.target.checked)}
                    className="mt-0.5 rounded border-slate-400 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <label htmlFor="safety-interlock" className="text-xs text-rose-800 dark:text-rose-200 cursor-pointer">
                    <span className="font-semibold block">Critical Hardware Interlock</span>
                    I confirm that interrupting power to this critical infrastructure (
                    {pendingAction.outlet.equipment}) is intentional and will not cause unintended data loss.
                  </label>
                </div>
              </div>
            )}

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                disabled={isSubmitting}
                onClick={() => setPendingAction(null)}
                className="px-4 py-2 text-xs font-medium rounded border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={
                  isSubmitting ||
                  (pendingAction.outlet.isCriticalLocked &&
                    pendingAction.action !== 'on' &&
                    !safetyOverrideChecked)
                }
                onClick={executeConfirmedAction}
                className={`px-4 py-2 text-xs font-medium text-white rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                  pendingAction.outlet.isCriticalLocked &&
                  pendingAction.action !== 'on' &&
                  !safetyOverrideChecked
                    ? 'opacity-40 cursor-not-allowed bg-rose-900'
                    : pendingAction.action === 'off'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : pendingAction.action === 'reboot'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {isSubmitting ? (
                  <span>Executing SNMP SET...</span>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Confirm & Execute</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
