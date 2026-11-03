/**
 * Lynceus Power Monitor & Control Types
 */

export type DeviceType = 'ups' | 'pdu';

export interface OutletConfig {
  index: number;
  name: string;
  equipment?: string;
  isCriticalLocked?: boolean;
  rebootDelaySec?: number;
}

export interface OutletStatus extends OutletConfig {
  state: 'on' | 'off' | 'rebooting' | 'error' | 'unknown';
  currentAmps?: number;
  powerWatts?: number;
  lastChanged?: string;
  countdownSec?: number;
}

export interface OidProfile {
  id: string;
  name: string;
  deviceType: DeviceType;
  oids: {
    batteryCapacityPct?: string;
    batteryRuntimeMinutes?: string;
    batteryTempCelsius?: string;
    batteryVoltage?: string;
    inputVoltage?: string;
    inputFrequency?: string;
    outputLoadPct?: string;
    outputVoltage?: string;
    outputPowerWatts?: string;
    outputCurrentAmps?: string;
    totalCurrentAmps?: string;
    totalPowerWatts?: string;
    statusState?: string;
    outletStatusBaseOid?: string;
    outletControlBaseOid?: string;
    [key: string]: string | undefined;
  };
}

export interface SnmpV3Config {
  username: string;
  securityLevel: 'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
  authProtocol?: 'md5' | 'sha';
  authKey?: string;
  privProtocol?: 'des' | 'aes';
  privKey?: string;
  context?: string;
}

export interface DeviceConfig {
  id: string;
  name: string;
  type: DeviceType;
  host: string;
  port: number;
  snmpVersion: '1' | '2c' | '3';
  community?: string;
  credentialId?: string; // Reference to encrypted vault credential in SQLite
  v3?: SnmpV3Config;
  pollIntervalSec?: number;
  profile: string;
  nominalVoltage?: number;
  capacityWatts?: number;
  ratedAmps?: number;
  outlets?: OutletConfig[];
  enabled?: boolean;
}

export interface PowerSettings {
  pollIntervalDefaultSec: number;
  historyBufferMinutes: number;
  alertThresholds: {
    batteryRuntimeWarningMin: number;
    batteryRuntimeCriticalMin: number;
    overloadWarningPct: number;
    overloadCriticalPct: number;
    highTempCelsius: number;
    lowVoltageVac: number;
    highVoltageVac: number;
  };
  allowLabSimulationFallback: boolean;
}

export interface AppConfig {
  version: number;
  settings: PowerSettings;
  profiles: OidProfile[];
  devices: DeviceConfig[];
}

export interface MetricDataPoint {
  timestamp: number;
  inputVoltage: number;
  outputLoadPct?: number;
  batteryPct?: number;
  runtimeMin?: number;
  outputPowerWatts?: number;
  currentAmps?: number;
  tempCelsius?: number;
}

export type PowerState = 'normal' | 'on_battery' | 'low_battery' | 'overload' | 'bypass' | 'offline' | 'warning';

export interface DeviceTelemetry {
  id: string;
  name: string;
  type: DeviceType;
  host: string;
  port: number;
  pollIntervalSec?: number;
  isOnline: boolean;
  isSimulated: boolean;
  lastPolled: number;
  state: PowerState;
  stateDescription: string;
  
  // Power metrics
  inputVoltage: number;
  inputFrequency: number;
  outputVoltage: number;
  outputLoadPct: number;
  outputPowerWatts: number;
  outputCurrentAmps: number;
  
  // Battery metrics (for UPS)
  batteryPct?: number;
  runtimeRemainingMin?: number;
  batteryTempCelsius?: number;
  batteryVoltage?: number;
  
  // PDU metrics
  totalCurrentAmps?: number;
  ratedAmps?: number;
  capacityWatts?: number;
  
  // Switched Outlets
  outlets: OutletStatus[];
  
  // Short-lived rolling history (in-memory last N minutes)
  history: MetricDataPoint[];
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface DashboardAlert {
  id: string;
  timestamp: number;
  deviceId: string;
  deviceName: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  acknowledged: boolean;
  value?: string | number;
}

export interface OutletControlPayload {
  deviceId: string;
  outletIndex: number;
  action: 'on' | 'off' | 'reboot';
  delaySec?: number;
}

export interface SnmpTestRequest {
  host: string;
  port?: number;
  community?: string;
  version?: '1' | '2c' | '3';
  oid: string;
  v3?: SnmpV3Config;
}

export interface SnmpTestResult {
  success: boolean;
  oid: string;
  value?: string | number;
  type?: string;
  responseTimeMs?: number;
  error?: string;
}

export interface EncryptedField {
  ciphertext: string;
  iv: string;
  tag: string;
  version: number;
}

export interface VaultCredentialItem {
  id: string;
  label: string;
  snmpVersion: '1' | '2c' | '3';
  hasCommunity: boolean;
  v3Username?: string;
  v3SecurityLevel?: 'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
  v3AuthProtocol?: 'md5' | 'sha';
  hasV3AuthKey?: boolean;
  v3PrivProtocol?: 'des' | 'aes';
  hasV3PrivKey?: boolean;
  v3Context?: string;
  keyVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface VaultUserItem {
  id: string;
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  hasEncryptedPassword: boolean;
  keyVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  authenticated: boolean;
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export interface VaultStatus {
  masterKeyConfigured: boolean;
  masterKeySource: 'env' | 'fallback_file';
  activeKeyVersion: number;
  keyFingerprint: string;
  credentialsCount: number;
  usersCount?: number;
  lastRotatedAt?: string;
  cipherAlgorithm: string;
  sqlitePath: string;
}

export interface KeyRotationPayload {
  oldKey: string;
  newKey: string;
}

export interface KeyRotationResult {
  success: boolean;
  recordsRotated: number;
  snmpRecordsRotated?: number;
  userRecordsRotated?: number;
  newVersion: number;
  message: string;
}

export interface DockerInfo {
  dockerfile: string;
  dockerCompose: string;
  envExample: string;
  architecture: string;
}

