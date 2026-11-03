import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { AlertBanner } from './components/AlertBanner.tsx';
import { DeviceOverview } from './components/DeviceOverview.tsx';
import { OutletManager } from './components/OutletManager.tsx';
import { TelemetryCharts } from './components/TelemetryCharts.tsx';
import { YamlEditor } from './components/YamlEditor.tsx';
import { VaultSecurity } from './components/VaultSecurity.tsx';
import { DockerAndTools } from './components/DockerAndTools.tsx';
import { DeviceTelemetry, DashboardAlert } from './types/power.ts';
import { soundService } from './utils/audioAlert.ts';
import { useTheme } from './context/ThemeContext.tsx';
import { ShieldCheck, Server, AlertTriangle } from 'lucide-react';

export default function App() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedOutletDeviceId, setSelectedOutletDeviceId] = useState<string | undefined>();
  const [telemetry, setTelemetry] = useState<DeviceTelemetry[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);

  const prevAlertIdsRef = useRef<Set<string>>(new Set());

  // Polling data function
  const fetchTelemetryAndAlerts = useCallback(async () => {
    setIsPolling(true);
    try {
      const [telResult, alertResult] = await Promise.allSettled([
        fetch('/api/telemetry'),
        fetch('/api/alerts'),
      ]);

      if (telResult.status === 'fulfilled' && telResult.value.ok) {
        const ct = telResult.value.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          try {
            const telData = await telResult.value.json();
            if (telData && Array.isArray(telData.telemetry)) {
              setTelemetry(telData.telemetry);
            }
          } catch {
            // Ignore parse errors from transient payloads
          }
        }
      }

      if (alertResult.status === 'fulfilled' && alertResult.value.ok) {
        const ct = alertResult.value.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          try {
            const alertData = await alertResult.value.json();
            const newAlerts: DashboardAlert[] = Array.isArray(alertData?.alerts) ? alertData.alerts : [];
            setAlerts(newAlerts);

            // Check if there are newly arrived unacknowledged alerts to beep
            const unacked = newAlerts.filter((a) => !a.acknowledged);
            const hasNew = unacked.some((a) => !prevAlertIdsRef.current.has(a.id));
            if (hasNew && soundEnabled) {
              const hasCritical = unacked.some((a) => a.severity === 'critical');
              soundService.playAlertBeep(hasCritical);
            }
            prevAlertIdsRef.current = new Set(newAlerts.map((a) => a.id));
          } catch {
            // Ignore parse errors from transient payloads
          }
        }
      }
    } catch {
      // Background poll silently retries next interval without throwing uncaught errors
    } finally {
      setIsPolling(false);
      setInitialLoaded(true);
    }
  }, [soundEnabled]);

  // Initial and recurring poll loop
  useEffect(() => {
    fetchTelemetryAndAlerts();
    const interval = setInterval(fetchTelemetryAndAlerts, 3000);
    return () => clearInterval(interval);
  }, [fetchTelemetryAndAlerts]);

  // Sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundService.enabled = next;
  };

  // Alert handlers
  const handleAcknowledgeAlert = async (id: string) => {
    await fetch(`/api/alerts/${id}/ack`, { method: 'POST' });
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const handleDismissAlert = async (id: string) => {
    await fetch(`/api/alerts/${id}/dismiss`, { method: 'POST' });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClearAllAlerts = async () => {
    await fetch('/api/alerts/clear', { method: 'POST' });
    setAlerts([]);
  };

  // Outlet control handler
  const handleControlOutlet = async (
    deviceId: string,
    outletIndex: number,
    action: 'on' | 'off' | 'reboot',
    delaySec: number = 10
  ) => {
    try {
      const res = await fetch('/api/outlets/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, outletIndex, action, delaySec }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchTelemetryAndAlerts();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || data.error || 'Control failed' };
      }
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message };
    }
  };

  // Lab simulation event trigger (e.g. simulated mains outage)
  const handleTriggerLabEvent = async (
    deviceId: string,
    event: 'toggle_mains' | 'toggle_overload' | 'toggle_temp'
  ) => {
    try {
      await fetch('/api/lab/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, event }),
      });
      fetchTelemetryAndAlerts();
    } catch (err) {
      console.error('Failed to trigger lab event:', err);
    }
  };

  // Navigate to outlets with optional target device preselected
  const handleNavigateToOutlets = (deviceId?: string) => {
    if (deviceId) {
      setSelectedOutletDeviceId(deviceId);
    }
    setActiveTab('outlets');
  };

  const criticalCount = alerts.filter((a) => !a.acknowledged && a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => !a.acknowledged && a.severity === 'warning').length;

  return (
    <div className="min-h-screen theme-bg theme-text-main flex flex-col font-sans transition-colors duration-150">
      {/* 1. Header (Follows Top Bar Contract) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertCount={alerts.filter((a) => !a.acknowledged).length}
        criticalAlertCount={criticalCount}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
        isPolling={isPolling}
        triggerManualRefresh={fetchTelemetryAndAlerts}
        openAlertsDrawer={() => setAlertsDrawerOpen(true)}
      />

      {/* 2. Persistent In-Dashboard Alert Strip & Drawer */}
      <AlertBanner
        alerts={alerts}
        drawerOpen={alertsDrawerOpen}
        setDrawerOpen={setAlertsDrawerOpen}
        onAcknowledge={handleAcknowledgeAlert}
        onDismiss={handleDismissAlert}
        onClearAll={handleClearAllAlerts}
      />

      {/* 3. Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!initialLoaded ? (
          <div className="h-64 flex flex-col items-center justify-center theme-text-dim text-xs font-mono space-y-2">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: theme.previewHex, borderTopColor: 'transparent' }}
            />
            <p>Initializing SNMP engine and loading YAML device profiles...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <DeviceOverview
                telemetry={telemetry}
                onTriggerLabEvent={handleTriggerLabEvent}
                onNavigateToOutlets={handleNavigateToOutlets}
              />
            )}

            {activeTab === 'outlets' && (
              <OutletManager
                telemetry={telemetry}
                selectedDeviceId={selectedOutletDeviceId}
                onControlOutlet={handleControlOutlet}
              />
            )}

            {activeTab === 'telemetry' && <TelemetryCharts telemetry={telemetry} />}

            {activeTab === 'yaml' && (
              <YamlEditor onSaveSuccess={fetchTelemetryAndAlerts} />
            )}

            {activeTab === 'vault' && <VaultSecurity />}

            {activeTab === 'docker' && <DockerAndTools />}
          </>
        )}
      </main>

      {/* 4. Quiet Production Footer */}
      <footer className="border-t theme-border theme-card py-4 text-xs theme-text-muted transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${theme.brandDotClass}`} />
            <span className="theme-text-main font-semibold">Lynceus SNMP Power Monitor</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>Private LAN Infrastructure</span>
          </div>
          <div className="flex items-center gap-3">
            <span>RFC 1628 & APC PowerNet</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>Docker Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

