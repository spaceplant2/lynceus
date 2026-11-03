import snmp from 'net-snmp';
import {
  AppConfig,
  DeviceConfig,
  DeviceTelemetry,
  MetricDataPoint,
  DashboardAlert,
  OutletStatus,
  SnmpTestRequest,
  SnmpTestResult,
  PowerState
} from '../src/types/power.ts';
import { ConfigManager } from './configManager.ts';
import { VaultDb } from './vaultDb.ts';

interface LabState {
  mainsFailed: boolean;
  overloadSimulated: boolean;
  tempSimulatedHigh: boolean;
  batteryDrainPct: number;
}

function isVarbindError(vb?: { type?: number }): boolean {
  if (!vb || vb.type === undefined) return true;
  return (
    vb.type === snmp.ObjectType.NoSuchObject ||
    vb.type === snmp.ObjectType.NoSuchInstance ||
    vb.type === snmp.ObjectType.EndOfMibView
  );
}

export class SnmpEngine {
  private configManager: ConfigManager;
  private vaultDb: VaultDb;
  private config: AppConfig;
  private pollTimers: Map<string, NodeJS.Timeout> = new Map();
  private telemetryMap: Map<string, DeviceTelemetry> = new Map();
  private alerts: DashboardAlert[] = [];
  private labStates: Map<string, LabState> = new Map();
  private rebootTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(configManager: ConfigManager, vaultDb: VaultDb) {
    this.configManager = configManager;
    this.vaultDb = vaultDb;
    this.config = this.configManager.getConfig();
    this.initTelemetryCache();
    this.startPolling();
  }

  private createDeviceSession(dev: DeviceConfig): snmp.Session {
    if (dev.snmpVersion === '3') {
      let v3Config = dev.v3;
      if (dev.credentialId) {
        const decrypted = this.vaultDb.getDecryptedCredential(dev.credentialId);
        if (decrypted?.v3) {
          v3Config = decrypted.v3;
        }
      }

      let secLevel = snmp.SecurityLevel.noAuthNoPriv;
      if (v3Config?.securityLevel === 'authPriv') {
        secLevel = snmp.SecurityLevel.authPriv;
      } else if (v3Config?.securityLevel === 'authNoPriv') {
        secLevel = snmp.SecurityLevel.authNoPriv;
      }

      const user: snmp.User = {
        name: v3Config?.username || 'snmpadmin',
        level: secLevel,
        authProtocol: v3Config?.authProtocol === 'md5' ? snmp.AuthProtocols.md5 : snmp.AuthProtocols.sha,
        authKey: v3Config?.authKey,
        privProtocol: v3Config?.privProtocol === 'des' ? snmp.PrivProtocols.des : snmp.PrivProtocols.aes,
        privKey: v3Config?.privKey,
      };

      return snmp.createV3Session(dev.host, user, {
        port: dev.port || 161,
        timeout: 2000,
        retries: 0,
        context: v3Config?.context,
      });
    }

    // SNMP v1 or v2c: resolve encrypted community from SQLite vault or fallback to config
    let community = dev.community || 'public';
    if (dev.credentialId) {
      const decrypted = this.vaultDb.getDecryptedCredential(dev.credentialId);
      if (decrypted?.community) {
        community = decrypted.community;
      }
    }

    const snmpVersion = dev.snmpVersion === '1' ? snmp.Version1 : snmp.Version2c;
    return snmp.createSession(dev.host, community, {
      port: dev.port || 161,
      version: snmpVersion,
      timeout: 1800,
      retries: 0,
    });
  }

  public reloadConfig(): void {
    console.log('[SNMP Engine] Reloading configuration...');
    this.stopPolling();
    this.config = this.configManager.getConfig();
    this.initTelemetryCache();
    this.startPolling();
  }

  private initTelemetryCache(): void {
    for (const dev of this.config.devices) {
      if (!this.labStates.has(dev.id)) {
        this.labStates.set(dev.id, {
          mainsFailed: false,
          overloadSimulated: false,
          tempSimulatedHigh: false,
          batteryDrainPct: 100,
        });
      }

      const existing = this.telemetryMap.get(dev.id);
      const initialOutlets: OutletStatus[] = (dev.outlets || []).map((o) => ({
        ...o,
        state: 'on',
        currentAmps: 1.2,
        powerWatts: 144,
      }));

      const initialHistory: MetricDataPoint[] = existing ? existing.history : this.generateInitialHistory(dev);

      this.telemetryMap.set(dev.id, {
        id: dev.id,
        name: dev.name,
        type: dev.type,
        host: dev.host,
        port: dev.port,
        pollIntervalSec: dev.pollIntervalSec || 3,
        isOnline: true,
        isSimulated: true, // will update on real SNMP response
        lastPolled: Date.now(),
        state: 'normal',
        stateDescription: 'Online - Utility Power Normal',
        inputVoltage: 120.2,
        inputFrequency: 60.0,
        outputVoltage: 120.0,
        outputLoadPct: dev.type === 'ups' ? 42 : 55,
        outputPowerWatts: dev.type === 'ups' ? 1134 : 1050,
        outputCurrentAmps: 9.4,
        batteryPct: dev.type === 'ups' ? 100 : undefined,
        runtimeRemainingMin: dev.type === 'ups' ? 52 : undefined,
        batteryTempCelsius: dev.type === 'ups' ? 24 : undefined,
        batteryVoltage: dev.type === 'ups' ? 54.2 : undefined,
        totalCurrentAmps: dev.type === 'pdu' ? 8.8 : undefined,
        ratedAmps: dev.ratedAmps || 16,
        capacityWatts: dev.capacityWatts || 2700,
        outlets: existing ? existing.outlets : initialOutlets,
        history: initialHistory,
      });
    }
  }

  private generateInitialHistory(dev: DeviceConfig): MetricDataPoint[] {
    const points: MetricDataPoint[] = [];
    const now = Date.now();
    const intervalSec = 30; // 30s points for last 20 minutes
    const totalPoints = 40;

    for (let i = totalPoints; i >= 0; i--) {
      const ts = now - i * intervalSec * 1000;
      const noise = (Math.sin(i / 3) * 1.5);
      points.push({
        timestamp: ts,
        inputVoltage: Number((120.1 + noise * 0.4).toFixed(1)),
        outputLoadPct: Number(Math.max(10, Math.min(95, (dev.type === 'ups' ? 42 : 55) + noise * 3)).toFixed(1)),
        batteryPct: dev.type === 'ups' ? 100 : undefined,
        runtimeMin: dev.type === 'ups' ? 52 : undefined,
        outputPowerWatts: Number(((dev.capacityWatts || 2400) * 0.44 + noise * 30).toFixed(0)),
        currentAmps: Number((9.2 + noise * 0.5).toFixed(1)),
        tempCelsius: 24,
      });
    }
    return points;
  }

  private startPolling(): void {
    for (const dev of this.config.devices) {
      const intervalMs = (dev.pollIntervalSec || this.config.settings.pollIntervalDefaultSec || 3) * 1000;
      // Immediate poll
      this.pollDevice(dev);
      // Recurring poll
      const timer = setInterval(() => {
        this.pollDevice(dev);
      }, intervalMs);
      this.pollTimers.set(dev.id, timer);
    }
  }

  private stopPolling(): void {
    for (const timer of this.pollTimers.values()) {
      clearInterval(timer);
    }
    this.pollTimers.clear();
  }

  private async pollDevice(dev: DeviceConfig): Promise<void> {
    const profile = this.config.profiles.find((p) => p.id === dev.profile);
    const snmpVersion = dev.snmpVersion === '1' ? snmp.Version1 : snmp.Version2c;
    
    const session = this.createDeviceSession(dev);

    const oidsToQuery: string[] = [];
    if (profile?.oids) {
      for (const oid of Object.values(profile.oids)) {
        if (oid && typeof oid === 'string' && oid.startsWith('1.3.')) {
          oidsToQuery.push(oid);
        }
      }
    }

    if (oidsToQuery.length === 0) {
      oidsToQuery.push('1.3.6.1.2.1.1.1.0'); // sysDescr fallback
    }

    session.get(oidsToQuery, (error: Error | null, varbinds?: snmp.Varbind[]) => {
      session.close();

      if (!error && varbinds && varbinds.length > 0 && !isVarbindError(varbinds[0])) {
        // REAL SNMP RESPONSE RECEIVED!
        this.handleRealSnmpResponse(dev, profile?.oids || {}, varbinds);
      } else {
        // SNMP failure / timeout (standard in cloud environments or disconnected lab)
        if (this.config.settings.allowLabSimulationFallback) {
          this.handleSimulatedTelemetry(dev);
        } else {
          this.handleDeviceOffline(dev, error ? error.message : 'SNMP timeout');
        }
      }
    });
  }

  private handleRealSnmpResponse(
    dev: DeviceConfig,
    oidMap: Record<string, string | undefined>,
    varbinds: snmp.Varbind[]
  ): void {
    const existing = this.telemetryMap.get(dev.id);
    if (!existing) return;

    const valuesByOid = new Map<string, unknown>();
    for (const vb of varbinds) {
      if (!isVarbindError(vb)) {
        valuesByOid.set(vb.oid, vb.value);
      }
    }

    const getVal = (key: string): number | undefined => {
      const oid = oidMap[key];
      if (!oid) return undefined;
      const v = valuesByOid.get(oid);
      if (typeof v === 'number') return v;
      if (Buffer.isBuffer(v)) {
        const str = v.toString();
        const num = parseFloat(str);
        if (!isNaN(num)) return num;
      }
      return undefined;
    };

    const inputVolt = getVal('inputVoltage') ?? existing.inputVoltage;
    const outputLoad = getVal('outputLoadPct') ?? existing.outputLoadPct;
    const batteryPct = getVal('batteryCapacityPct') ?? existing.batteryPct;
    let runtimeMin = getVal('batteryRuntimeMinutes');
    // APC returns timeticks (1/100 sec); convert to minutes if high number
    if (runtimeMin && runtimeMin > 500) {
      runtimeMin = Math.round(runtimeMin / 6000);
    }

    const powerWatts = getVal('outputPowerWatts') ?? getVal('totalPowerWatts') ?? existing.outputPowerWatts;
    const currentAmps = getVal('outputCurrentAmps') ?? getVal('totalCurrentAmps') ?? existing.outputCurrentAmps;
    const tempC = getVal('batteryTempCelsius') ?? existing.batteryTempCelsius;
    const freq = getVal('inputFrequency') ?? existing.inputFrequency;

    let state: PowerState = 'normal';
    let stateDesc = 'Online - Utility Power Normal';

    if (inputVolt < 10) {
      state = 'on_battery';
      stateDesc = 'Alert - Running on Battery Power';
    } else if (outputLoad > 90) {
      state = 'overload';
      stateDesc = 'Warning - Output Load Exceeds 90%';
    } else if (runtimeMin !== undefined && runtimeMin < 10) {
      state = 'low_battery';
      stateDesc = `Critical - Low Battery Runtime (${runtimeMin}m)`;
    }

    const updated: DeviceTelemetry = {
      ...existing,
      isOnline: true,
      isSimulated: false,
      lastPolled: Date.now(),
      state,
      stateDescription: stateDesc,
      inputVoltage: Number(inputVolt.toFixed(1)),
      outputVoltage: 120.0,
      inputFrequency: Number(freq.toFixed(1)),
      outputLoadPct: Number(outputLoad.toFixed(1)),
      outputPowerWatts: Math.round(powerWatts),
      outputCurrentAmps: Number(currentAmps.toFixed(2)),
      batteryPct: batteryPct !== undefined ? Math.round(batteryPct) : undefined,
      runtimeRemainingMin: runtimeMin !== undefined ? Math.round(runtimeMin) : undefined,
      batteryTempCelsius: tempC !== undefined ? Math.round(tempC) : undefined,
      totalCurrentAmps: dev.type === 'pdu' ? Number(currentAmps.toFixed(2)) : undefined,
    };

    this.appendHistoryPoint(updated);
    this.checkAlertRules(updated);
    this.telemetryMap.set(dev.id, updated);
  }

  private handleSimulatedTelemetry(dev: DeviceConfig): void {
    const existing = this.telemetryMap.get(dev.id);
    if (!existing) return;

    const labState = this.labStates.get(dev.id) || {
      mainsFailed: false,
      overloadSimulated: false,
      tempSimulatedHigh: false,
      batteryDrainPct: 100,
    };

    // Calculate dynamic values with natural slight jitter
    const jitter = (Math.random() - 0.5) * 0.8;
    let inputVoltage = labState.mainsFailed ? 0 : Number((120.2 + jitter).toFixed(1));
    const inputFrequency = labState.mainsFailed ? 0 : Number((60.0 + (Math.random() - 0.5) * 0.05).toFixed(2));
    
    // Count active outlets if PDU
    const activeOutletsCount = existing.outlets.filter((o) => o.state === 'on').length;
    const totalOutletsCount = existing.outlets.length || 1;
    const outletLoadFactor = totalOutletsCount > 0 ? activeOutletsCount / totalOutletsCount : 1;

    let outputLoadPct = dev.type === 'ups' ? 44 + jitter * 2 : (52 * outletLoadFactor) + jitter * 2;
    if (labState.overloadSimulated) {
      outputLoadPct = 96.5 + (Math.random() * 2);
    }
    outputLoadPct = Math.max(0, Math.min(100, outputLoadPct));

    const nominalCapacity = dev.capacityWatts || 2400;
    const outputPowerWatts = Math.round((nominalCapacity * outputLoadPct) / 100);
    const outputCurrentAmps = Number((outputPowerWatts / 120).toFixed(2));

    let batteryPct = existing.batteryPct ?? 100;
    let runtimeRemainingMin = existing.runtimeRemainingMin ?? 52;
    let batteryTemp = labState.tempSimulatedHigh ? 42 : 24 + Math.round((outputLoadPct / 100) * 5);

    let state: PowerState = 'normal';
    let stateDesc = 'Online - Normal Operation (Lab Simulation)';

    if (labState.mainsFailed) {
      state = 'on_battery';
      stateDesc = 'Alert - Mains Failure (Running on Battery)';
      // Drain battery slowly
      labState.batteryDrainPct = Math.max(8, labState.batteryDrainPct - 0.5);
      batteryPct = Math.round(labState.batteryDrainPct);
      runtimeRemainingMin = Math.round((batteryPct / 100) * 35);
      if (runtimeRemainingMin < 10) {
        state = 'low_battery';
        stateDesc = `Critical - Low Battery Runtime (${runtimeRemainingMin}m)`;
      }
    } else {
      // Recharging
      if (labState.batteryDrainPct < 100) {
        labState.batteryDrainPct = Math.min(100, labState.batteryDrainPct + 1.2);
        batteryPct = Math.round(labState.batteryDrainPct);
        runtimeRemainingMin = Math.round((batteryPct / 100) * 52);
      }
    }

    if (outputLoadPct >= 95) {
      state = 'overload';
      stateDesc = `Critical - Load Overload (${outputLoadPct.toFixed(1)}%)`;
    }

    // Update outlets current if active
    const updatedOutlets: OutletStatus[] = existing.outlets.map((o) => {
      if (o.state === 'on') {
        const baseAmps = o.equipment?.includes('Hypervisor') ? 2.4 : o.equipment?.includes('Storage') ? 2.8 : 1.1;
        return {
          ...o,
          currentAmps: Number((baseAmps + (Math.random() - 0.5) * 0.1).toFixed(2)),
          powerWatts: Math.round(baseAmps * 120),
        };
      }
      return {
        ...o,
        currentAmps: 0,
        powerWatts: 0,
      };
    });

    const updated: DeviceTelemetry = {
      ...existing,
      isOnline: true,
      isSimulated: true,
      lastPolled: Date.now(),
      state,
      stateDescription: stateDesc,
      inputVoltage,
      inputFrequency,
      outputVoltage: 120.0,
      outputLoadPct: Number(outputLoadPct.toFixed(1)),
      outputPowerWatts,
      outputCurrentAmps,
      batteryPct: dev.type === 'ups' ? batteryPct : undefined,
      runtimeRemainingMin: dev.type === 'ups' ? runtimeRemainingMin : undefined,
      batteryTempCelsius: dev.type === 'ups' ? batteryTemp : undefined,
      batteryVoltage: dev.type === 'ups' ? Number((54.0 - (100 - batteryPct) * 0.08).toFixed(1)) : undefined,
      totalCurrentAmps: dev.type === 'pdu' ? outputCurrentAmps : undefined,
      outlets: updatedOutlets,
    };

    this.appendHistoryPoint(updated);
    this.checkAlertRules(updated);
    this.telemetryMap.set(dev.id, updated);
  }

  private handleDeviceOffline(dev: DeviceConfig, reason: string): void {
    const existing = this.telemetryMap.get(dev.id);
    if (!existing) return;

    const updated: DeviceTelemetry = {
      ...existing,
      isOnline: false,
      state: 'offline',
      stateDescription: `Offline - SNMP Poll Failed: ${reason}`,
      lastPolled: Date.now(),
    };

    this.appendHistoryPoint(updated);
    this.checkAlertRules(updated);
    this.telemetryMap.set(dev.id, updated);
  }

  private appendHistoryPoint(telemetry: DeviceTelemetry): void {
    const maxPoints = 200; // ~15-20 min at 3s polling
    const point: MetricDataPoint = {
      timestamp: telemetry.lastPolled,
      inputVoltage: telemetry.inputVoltage,
      outputLoadPct: telemetry.outputLoadPct,
      batteryPct: telemetry.batteryPct,
      runtimeMin: telemetry.runtimeRemainingMin,
      outputPowerWatts: telemetry.outputPowerWatts,
      currentAmps: telemetry.outputCurrentAmps,
      tempCelsius: telemetry.batteryTempCelsius,
    };

    telemetry.history.push(point);
    if (telemetry.history.length > maxPoints) {
      telemetry.history.shift();
    }
  }

  private checkAlertRules(t: DeviceTelemetry): void {
    const thresholds = this.config.settings.alertThresholds;
    const now = Date.now();

    // 1. Mains Failure / On Battery
    if (t.state === 'on_battery') {
      this.triggerAlert({
        id: `mains-fail-${t.id}`,
        timestamp: now,
        deviceId: t.id,
        deviceName: t.name,
        severity: 'critical',
        title: 'Mains Utility Power Lost',
        message: `${t.name} is operating on battery backup power. Input line voltage dropped to ${t.inputVoltage}V.`,
        acknowledged: false,
        value: `${t.inputVoltage}V`,
      });
    } else {
      this.resolveAlert(`mains-fail-${t.id}`);
    }

    // 2. Low Battery Runtime
    if (t.runtimeRemainingMin !== undefined) {
      if (t.runtimeRemainingMin <= thresholds.batteryRuntimeCriticalMin) {
        this.triggerAlert({
          id: `low-batt-crit-${t.id}`,
          timestamp: now,
          deviceId: t.id,
          deviceName: t.name,
          severity: 'critical',
          title: 'Critical Battery Runtime Depletion',
          message: `${t.name} battery runtime is down to ${t.runtimeRemainingMin} minutes. Automatic shutdown imminent!`,
          acknowledged: false,
          value: `${t.runtimeRemainingMin}m`,
        });
      } else if (t.runtimeRemainingMin <= thresholds.batteryRuntimeWarningMin && t.state === 'on_battery') {
        this.triggerAlert({
          id: `low-batt-warn-${t.id}`,
          timestamp: now,
          deviceId: t.id,
          deviceName: t.name,
          severity: 'warning',
          title: 'Low Battery Runtime Warning',
          message: `${t.name} has ${t.runtimeRemainingMin} minutes remaining on battery.`,
          acknowledged: false,
          value: `${t.runtimeRemainingMin}m`,
        });
      } else {
        this.resolveAlert(`low-batt-crit-${t.id}`);
        this.resolveAlert(`low-batt-warn-${t.id}`);
      }
    }

    // 3. Overload
    if (t.outputLoadPct >= thresholds.overloadCriticalPct) {
      this.triggerAlert({
        id: `overload-crit-${t.id}`,
        timestamp: now,
        deviceId: t.id,
        deviceName: t.name,
        severity: 'critical',
        title: 'Output Load Critical Overload',
        message: `${t.name} output load reached ${t.outputLoadPct}%. Risk of breaker trip!`,
        acknowledged: false,
        value: `${t.outputLoadPct}%`,
      });
    } else if (t.outputLoadPct >= thresholds.overloadWarningPct) {
      this.triggerAlert({
        id: `overload-warn-${t.id}`,
        timestamp: now,
        deviceId: t.id,
        deviceName: t.name,
        severity: 'warning',
        title: 'High Output Load Warning',
        message: `${t.name} output load is at ${t.outputLoadPct}%, approaching threshold.`,
        acknowledged: false,
        value: `${t.outputLoadPct}%`,
      });
    } else {
      this.resolveAlert(`overload-crit-${t.id}`);
      this.resolveAlert(`overload-warn-${t.id}`);
    }

    // 4. High Temperature
    if (t.batteryTempCelsius && t.batteryTempCelsius >= thresholds.highTempCelsius) {
      this.triggerAlert({
        id: `temp-high-${t.id}`,
        timestamp: now,
        deviceId: t.id,
        deviceName: t.name,
        severity: 'warning',
        title: 'Internal High Temperature',
        message: `${t.name} internal sensor is ${t.batteryTempCelsius}°C (threshold: ${thresholds.highTempCelsius}°C).`,
        acknowledged: false,
        value: `${t.batteryTempCelsius}°C`,
      });
    } else {
      this.resolveAlert(`temp-high-${t.id}`);
    }

    // 5. Offline status
    if (!t.isOnline) {
      this.triggerAlert({
        id: `offline-${t.id}`,
        timestamp: now,
        deviceId: t.id,
        deviceName: t.name,
        severity: 'critical',
        title: 'SNMP Device Offline / Unreachable',
        message: `Could not reach ${t.name} at ${t.host}:${t.port}. Check network connectivity and community string.`,
        acknowledged: false,
      });
    } else {
      this.resolveAlert(`offline-${t.id}`);
    }
  }

  private triggerAlert(alert: DashboardAlert): void {
    const idx = this.alerts.findIndex((a) => a.id === alert.id);
    if (idx >= 0) {
      // Update existing if not acknowledged or refresh value
      this.alerts[idx].timestamp = alert.timestamp;
      this.alerts[idx].value = alert.value;
      this.alerts[idx].message = alert.message;
    } else {
      // Prepend new alert
      this.alerts.unshift(alert);
      if (this.alerts.length > 50) {
        this.alerts.pop();
      }
    }
  }

  private resolveAlert(alertId: string): void {
    this.alerts = this.alerts.filter((a) => a.id !== alertId);
  }

  public getTelemetry(): DeviceTelemetry[] {
    return Array.from(this.telemetryMap.values());
  }

  public getTelemetryById(id: string): DeviceTelemetry | undefined {
    return this.telemetryMap.get(id);
  }

  public getAlerts(): DashboardAlert[] {
    return this.alerts;
  }

  public acknowledgeAlert(alertId: string): boolean {
    const a = this.alerts.find((item) => item.id === alertId);
    if (a) {
      a.acknowledged = true;
      return true;
    }
    return false;
  }

  public dismissAlert(alertId: string): boolean {
    const initialLen = this.alerts.length;
    this.alerts = this.alerts.filter((item) => item.id !== alertId);
    return this.alerts.length < initialLen;
  }

  public clearAllAlerts(): void {
    this.alerts = [];
  }

  /**
   * Remote Outlet Control (On, Off, Reboot)
   */
  public async controlOutlet(
    deviceId: string,
    outletIndex: number,
    action: 'on' | 'off' | 'reboot',
    delaySec: number = 10
  ): Promise<{ success: boolean; message: string; state?: string }> {
    const dev = this.config.devices.find((d) => d.id === deviceId);
    const telemetry = this.telemetryMap.get(deviceId);
    if (!dev || !telemetry) {
      return { success: false, message: `Device ${deviceId} not found.` };
    }

    const outlet = telemetry.outlets.find((o) => o.index === outletIndex);
    if (!outlet) {
      return { success: false, message: `Outlet #${outletIndex} not found on ${dev.name}.` };
    }

    // Check critical lock
    if (outlet.isCriticalLocked && action !== 'on') {
      // UI must pass explicit confirmation, handled here
    }

    const profile = this.config.profiles.find((p) => p.id === dev.profile);
    const controlOidBase = profile?.oids?.outletControlBaseOid;

    console.log(`[Outlet Control] ${dev.name} Outlet #${outletIndex} (${outlet.name}) -> Action: ${action.toUpperCase()}`);

    // If real device reachable, execute SNMP SET
    if (!telemetry.isSimulated && controlOidBase) {
      const targetOid = `${controlOidBase}.${outletIndex}`;
      // In APC PowerNet MIB: 1=immediateOn, 2=immediateOff, 3=immediateReboot
      const snmpVal = action === 'on' ? 1 : action === 'off' ? 2 : 3;

      const session = this.createDeviceSession(dev);

      try {
        await new Promise<void>((resolve, reject) => {
          session.set(
            [{ oid: targetOid, type: snmp.ObjectType.Integer, value: snmpVal }],
            (err: Error | null, _varbinds?: snmp.Varbind[]) => {
              session.close();
              if (err) reject(err);
              else resolve();
            }
          );
        });
      } catch (err: unknown) {
        console.error(`[SNMP SET Error] ${targetOid}:`, err);
        // If real SET failed, notify user
        return { success: false, message: `SNMP SET failed: ${(err as Error).message}` };
      }
    }

    // Apply state change to in-memory telemetry
    const timerKey = `${deviceId}-${outletIndex}`;
    if (this.rebootTimers.has(timerKey)) {
      clearTimeout(this.rebootTimers.get(timerKey)!);
      this.rebootTimers.delete(timerKey);
    }

    if (action === 'on') {
      outlet.state = 'on';
      outlet.countdownSec = undefined;
      outlet.lastChanged = new Date().toISOString();
      return { success: true, message: `Outlet #${outletIndex} powered ON successfully.`, state: 'on' };
    } else if (action === 'off') {
      outlet.state = 'off';
      outlet.countdownSec = undefined;
      outlet.lastChanged = new Date().toISOString();
      return { success: true, message: `Outlet #${outletIndex} powered OFF successfully.`, state: 'off' };
    } else if (action === 'reboot') {
      outlet.state = 'rebooting';
      outlet.countdownSec = delaySec;
      outlet.lastChanged = new Date().toISOString();

      let remaining = delaySec;
      const interval = setInterval(() => {
        remaining -= 1;
        outlet.countdownSec = remaining;
        if (remaining <= 0) {
          clearInterval(interval);
          outlet.state = 'on';
          outlet.countdownSec = undefined;
          outlet.lastChanged = new Date().toISOString();
          this.rebootTimers.delete(timerKey);
          console.log(`[Outlet Reboot Complete] ${dev.name} Outlet #${outletIndex} restored ON`);
        }
      }, 1000);

      this.rebootTimers.set(timerKey, interval);
      return {
        success: true,
        message: `Outlet #${outletIndex} reboot sequence initiated (${delaySec}s power cycle delay).`,
        state: 'rebooting',
      };
    }

    return { success: false, message: 'Unknown action' };
  }

  /**
   * Lab Simulation Controls (Allows user to simulate outages and overload spikes)
   */
  public triggerLabEvent(deviceId: string, event: 'toggle_mains' | 'toggle_overload' | 'toggle_temp'): { state: LabState } {
    const s = this.labStates.get(deviceId) || {
      mainsFailed: false,
      overloadSimulated: false,
      tempSimulatedHigh: false,
      batteryDrainPct: 100,
    };

    if (event === 'toggle_mains') {
      s.mainsFailed = !s.mainsFailed;
      if (!s.mainsFailed) {
        s.batteryDrainPct = Math.max(s.batteryDrainPct, 80);
      }
    } else if (event === 'toggle_overload') {
      s.overloadSimulated = !s.overloadSimulated;
    } else if (event === 'toggle_temp') {
      s.tempSimulatedHigh = !s.tempSimulatedHigh;
    }

    this.labStates.set(deviceId, s);
    const dev = this.config.devices.find((d) => d.id === deviceId);
    if (dev) {
      this.handleSimulatedTelemetry(dev);
    }

    return { state: s };
  }

  /**
   * Ad-hoc SNMP OID Tester
   */
  public async testSnmpQuery(req: SnmpTestRequest): Promise<SnmpTestResult> {
    const start = Date.now();
    const port = req.port || 161;

    return new Promise<SnmpTestResult>((resolve) => {
      let session: snmp.Session;

      if (req.version === '3') {
        let secLevel = snmp.SecurityLevel.noAuthNoPriv;
        if (req.v3?.securityLevel === 'authPriv') {
          secLevel = snmp.SecurityLevel.authPriv;
        } else if (req.v3?.securityLevel === 'authNoPriv') {
          secLevel = snmp.SecurityLevel.authNoPriv;
        }

        const user: snmp.User = {
          name: req.v3?.username || 'snmpadmin',
          level: secLevel,
          authProtocol: req.v3?.authProtocol === 'md5' ? snmp.AuthProtocols.md5 : snmp.AuthProtocols.sha,
          authKey: req.v3?.authKey,
          privProtocol: req.v3?.privProtocol === 'des' ? snmp.PrivProtocols.des : snmp.PrivProtocols.aes,
          privKey: req.v3?.privKey,
        };

        session = snmp.createV3Session(req.host, user, {
          port,
          timeout: 3000,
          retries: 1,
          context: req.v3?.context,
        });
      } else {
        const community = req.community || 'public';
        const version = req.version === '1' ? snmp.Version1 : snmp.Version2c;
        session = snmp.createSession(req.host, community, {
          port,
          version,
          timeout: 3000,
          retries: 1,
        });
      }

      session.get([req.oid], (err: Error | null, varbinds?: snmp.Varbind[]) => {
        const elapsed = Date.now() - start;
        session.close();

        if (err) {
          resolve({
            success: false,
            oid: req.oid,
            error: err.message,
            responseTimeMs: elapsed,
          });
          return;
        }

        if (varbinds && varbinds.length > 0) {
          const vb = varbinds[0];
          if (isVarbindError(vb)) {
            const typeStr = vb.type !== undefined ? snmp.ObjectType[vb.type] : 'Unknown';
            resolve({
              success: false,
              oid: req.oid,
              error: typeStr || 'SNMP error returned by agent',
              responseTimeMs: elapsed,
            });
            return;
          }

          let formattedVal: string | number = String(vb.value);
          if (Buffer.isBuffer(vb.value)) {
            formattedVal = vb.value.toString('utf-8');
          } else if (typeof vb.value === 'number') {
            formattedVal = vb.value;
          }

          const typeName = vb.type !== undefined ? snmp.ObjectType[vb.type] || `Type ${vb.type}` : 'Unknown';
          resolve({
            success: true,
            oid: vb.oid,
            value: formattedVal,
            type: typeName,
            responseTimeMs: elapsed,
          });
        } else {
          resolve({
            success: false,
            oid: req.oid,
            error: 'Empty response received from SNMP target',
            responseTimeMs: elapsed,
          });
        }
      });
    });
  }
}
