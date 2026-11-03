import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { AppConfig, PowerSettings, OidProfile, DeviceConfig } from '../src/types/power.ts';

export type ConfigFileKey = 'settings' | 'profiles' | 'devices';

export interface ConfigFileInfo {
  key: ConfigFileKey;
  filename: string;
  title: string;
  description: string;
  path: string;
}

const DEFAULT_CONFIG_DIR = path.resolve(process.env.CONFIG_DIR || './config');

export class ConfigManager {
  private configDir: string;
  private cachedConfig: AppConfig | null = null;

  constructor(customDir?: string) {
    this.configDir = customDir || DEFAULT_CONFIG_DIR;
    this.ensureConfigFiles();
  }

  public getConfigDir(): string {
    return this.configDir;
  }

  public getFilePath(key: ConfigFileKey): string {
    switch (key) {
      case 'settings':
        return path.join(this.configDir, 'settings.yaml');
      case 'profiles':
        return path.join(this.configDir, 'profiles.yaml');
      case 'devices':
        return path.join(this.configDir, 'devices.yaml');
    }
  }

  public getFilesList(): ConfigFileInfo[] {
    return [
      {
        key: 'settings',
        filename: 'settings.yaml',
        title: 'General Settings',
        description: 'Alert thresholds, polling frequencies, and lab simulation fallback options',
        path: this.getFilePath('settings'),
      },
      {
        key: 'profiles',
        filename: 'profiles.yaml',
        title: 'MIB Profiles',
        description: 'Reusable SNMP OID mappings for APC PowerNet, RFC 1628, Eaton, etc.',
        path: this.getFilePath('profiles'),
      },
      {
        key: 'devices',
        filename: 'devices.yaml',
        title: 'Devices & Outlets',
        description: 'Hardware target IPs, ports, communities, and remote outlet mappings',
        path: this.getFilePath('devices'),
      },
    ];
  }

  private ensureConfigFiles(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    const settingsPath = this.getFilePath('settings');
    const profilesPath = this.getFilePath('profiles');
    const devicesPath = this.getFilePath('devices');

    // Check if migration from older single power-devices.yaml is needed
    const legacyPath = path.join(this.configDir, 'power-devices.yaml');
    if (fs.existsSync(legacyPath) && (!fs.existsSync(settingsPath) || !fs.existsSync(devicesPath))) {
      try {
        const legacyRaw = fs.readFileSync(legacyPath, 'utf-8');
        const legacyParsed = yaml.load(legacyRaw) as Partial<AppConfig>;

        if (legacyParsed.settings && !fs.existsSync(settingsPath)) {
          fs.writeFileSync(
            settingsPath,
            `# Lynceus - General Settings\nversion: 1\n\n${yaml.dump({ settings: legacyParsed.settings })}`,
            'utf-8'
          );
        }
        if (legacyParsed.profiles && !fs.existsSync(profilesPath)) {
          fs.writeFileSync(
            profilesPath,
            `# Lynceus - MIB Profiles\nversion: 1\n\n${yaml.dump({ profiles: legacyParsed.profiles })}`,
            'utf-8'
          );
        }
        if (legacyParsed.devices && !fs.existsSync(devicesPath)) {
          fs.writeFileSync(
            devicesPath,
            `# Lynceus - Devices & Outlets\nversion: 1\n\n${yaml.dump({ devices: legacyParsed.devices })}`,
            'utf-8'
          );
        }
      } catch (err) {
        console.error('Error during legacy config migration:', err);
      }
    }

    // Default settings.yaml
    if (!fs.existsSync(settingsPath)) {
      const defaultSettings = `# Lynceus - General Settings Configuration
version: 1

settings:
  pollIntervalDefaultSec: 3
  historyBufferMinutes: 30
  alertThresholds:
    batteryRuntimeWarningMin: 15
    batteryRuntimeCriticalMin: 5
    overloadWarningPct: 80
    overloadCriticalPct: 95
    highTempCelsius: 38
    lowVoltageVac: 108
    highVoltageVac: 128
  allowLabSimulationFallback: true
`;
      fs.writeFileSync(settingsPath, defaultSettings, 'utf-8');
    }

    // Default profiles.yaml
    if (!fs.existsSync(profilesPath)) {
      const defaultProfiles = `# Lynceus - MIB OID Profiles Configuration
version: 1

profiles:
  - id: apc-powernet-ups
    name: "APC PowerNet UPS (Smart-UPS / Symmetra)"
    deviceType: ups
    oids:
      batteryCapacityPct: "1.3.6.1.4.1.318.1.1.1.2.2.1.0"
      batteryRuntimeMinutes: "1.3.6.1.4.1.318.1.1.1.2.2.3.0"
      batteryTempCelsius: "1.3.6.1.4.1.318.1.1.1.2.2.2.0"
      batteryVoltage: "1.3.6.1.4.1.318.1.1.1.2.2.8.0"
      inputVoltage: "1.3.6.1.4.1.318.1.1.1.3.2.1.0"
      inputFrequency: "1.3.6.1.4.1.318.1.1.1.3.2.4.0"
      outputLoadPct: "1.3.6.1.4.1.318.1.1.1.4.2.3.0"
      outputVoltage: "1.3.6.1.4.1.318.1.1.1.4.2.1.0"
      outputPowerWatts: "1.3.6.1.4.1.318.1.1.1.4.2.8.0"
      outputCurrentAmps: "1.3.6.1.4.1.318.1.1.1.4.2.4.0"
      statusState: "1.3.6.1.4.1.318.1.1.1.4.1.1.0"

  - id: rfc1628-ups
    name: "Standard RFC 1628 UPS-MIB"
    deviceType: ups
    oids:
      batteryCapacityPct: "1.3.6.1.2.1.33.1.2.4.0"
      batteryRuntimeMinutes: "1.3.6.1.2.1.33.1.2.3.0"
      batteryTempCelsius: "1.3.6.1.2.1.33.1.2.7.0"
      batteryVoltage: "1.3.6.1.2.1.33.1.2.5.0"
      inputVoltage: "1.3.6.1.2.1.33.1.3.3.1.3.1"
      inputFrequency: "1.3.6.1.2.1.33.1.3.3.1.2.1"
      outputLoadPct: "1.3.6.1.2.1.33.1.4.4.1.5.1"
      outputVoltage: "1.3.6.1.2.1.33.1.4.4.1.2.1"
      outputPowerWatts: "1.3.6.1.2.1.33.1.4.4.1.4.1"
      outputCurrentAmps: "1.3.6.1.2.1.33.1.4.4.1.3.1"
      statusState: "1.3.6.1.2.1.33.1.4.1.0"

  - id: apc-switched-pdu
    name: "APC Switched Rack PDU (AP79xx / AP89xx)"
    deviceType: pdu
    oids:
      totalCurrentAmps: "1.3.6.1.4.1.318.1.1.12.2.3.1.1.2.1"
      inputVoltage: "1.3.6.1.4.1.318.1.1.12.1.1.0"
      totalPowerWatts: "1.3.6.1.4.1.318.1.1.12.1.16.0"
      outletStatusBaseOid: "1.3.6.1.4.1.318.1.1.4.4.2.1.3"
      outletControlBaseOid: "1.3.6.1.4.1.318.1.1.4.4.2.1.3"
`;
      fs.writeFileSync(profilesPath, defaultProfiles, 'utf-8');
    }

    // Default devices.yaml
    if (!fs.existsSync(devicesPath)) {
      const defaultDevices = `# Lynceus - Hardware Devices Configuration
version: 1

devices:
  - id: ups-datacenter-01
    name: "APC Smart-UPS RT 3000 (Rack 1A)"
    type: ups
    host: "192.168.10.15"
    port: 161
    snmpVersion: "2c"
    community: "public"
    pollIntervalSec: 3
    profile: apc-powernet-ups
    nominalVoltage: 120
    capacityWatts: 2700

  - id: pdu-rack-alpha
    name: "APC AP7920B 8-Port Switched PDU (Rack 1A)"
    type: pdu
    host: "192.168.10.20"
    port: 161
    snmpVersion: "2c"
    community: "private"
    pollIntervalSec: 3
    profile: apc-switched-pdu
    ratedAmps: 16
    nominalVoltage: 120
    outlets:
      - index: 1
        name: "Core Gateway Router"
        equipment: "Cisco ISR 4331"
        isCriticalLocked: true
        rebootDelaySec: 15
      - index: 2
        name: "Primary Core Switch"
        equipment: "Arista 7050SX3"
        isCriticalLocked: true
        rebootDelaySec: 10
      - index: 3
        name: "VMware Hypervisor 01"
        equipment: "Dell PowerEdge R640"
        isCriticalLocked: false
        rebootDelaySec: 20
      - index: 4
        name: "VMware Hypervisor 02"
        equipment: "Dell PowerEdge R640"
        isCriticalLocked: false
        rebootDelaySec: 20
`;
      fs.writeFileSync(devicesPath, defaultDevices, 'utf-8');
    }
  }

  public getRawYaml(key: ConfigFileKey): string {
    this.ensureConfigFiles();
    const filePath = this.getFilePath(key);
    return fs.readFileSync(filePath, 'utf-8');
  }

  public saveRawYaml(
    key: ConfigFileKey,
    newYaml: string
  ): { success: boolean; error?: string; config?: AppConfig } {
    try {
      const parsed = yaml.load(newYaml) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'YAML must contain a valid configuration object.' };
      }

      // Specific validation per file key
      if (key === 'settings' && !parsed.settings) {
        return { success: false, error: 'File must contain a top-level "settings:" section.' };
      }
      if (key === 'profiles' && !Array.isArray(parsed.profiles)) {
        return { success: false, error: 'File must contain a "profiles:" array list.' };
      }
      if (key === 'devices' && !Array.isArray(parsed.devices)) {
        return { success: false, error: 'File must contain a "devices:" array list.' };
      }

      const filePath = this.getFilePath(key);
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, `${filePath}.bak`);
      }

      fs.writeFileSync(filePath, newYaml, 'utf-8');
      const updatedConfig = this.getConfig();
      return { success: true, config: updatedConfig };
    } catch (err: unknown) {
      return { success: false, error: `Invalid YAML syntax: ${(err as Error).message}` };
    }
  }

  public getConfig(): AppConfig {
    try {
      this.ensureConfigFiles();
      const settingsRaw = this.getRawYaml('settings');
      const profilesRaw = this.getRawYaml('profiles');
      const devicesRaw = this.getRawYaml('devices');

      const settingsParsed = yaml.load(settingsRaw) as { settings?: Partial<PowerSettings> };
      const profilesParsed = yaml.load(profilesRaw) as { profiles?: OidProfile[] };
      const devicesParsed = yaml.load(devicesRaw) as { devices?: DeviceConfig[] };

      const config: AppConfig = {
        version: 1,
        settings: {
          pollIntervalDefaultSec: settingsParsed?.settings?.pollIntervalDefaultSec ?? 3,
          historyBufferMinutes: settingsParsed?.settings?.historyBufferMinutes ?? 30,
          alertThresholds: {
            batteryRuntimeWarningMin: settingsParsed?.settings?.alertThresholds?.batteryRuntimeWarningMin ?? 15,
            batteryRuntimeCriticalMin: settingsParsed?.settings?.alertThresholds?.batteryRuntimeCriticalMin ?? 5,
            overloadWarningPct: settingsParsed?.settings?.alertThresholds?.overloadWarningPct ?? 80,
            overloadCriticalPct: settingsParsed?.settings?.alertThresholds?.overloadCriticalPct ?? 95,
            highTempCelsius: settingsParsed?.settings?.alertThresholds?.highTempCelsius ?? 38,
            lowVoltageVac: settingsParsed?.settings?.alertThresholds?.lowVoltageVac ?? 108,
            highVoltageVac: settingsParsed?.settings?.alertThresholds?.highVoltageVac ?? 128,
          },
          allowLabSimulationFallback: settingsParsed?.settings?.allowLabSimulationFallback ?? true,
        },
        profiles: profilesParsed?.profiles || [],
        devices: devicesParsed?.devices || [],
      };

      this.cachedConfig = config;
      return config;
    } catch (err: unknown) {
      console.error('Error loading modular YAML configs:', err);
      if (this.cachedConfig) {
        return this.cachedConfig;
      }
      throw new Error(`Failed to parse YAML configuration: ${(err as Error).message}`);
    }
  }
}
