import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { ConfigManager } from './server/configManager.ts';
import { CryptoService } from './server/cryptoService.ts';
import { VaultDb } from './server/vaultDb.ts';
import { SnmpEngine } from './server/snmpEngine.ts';
import { SnmpTestRequest } from './src/types/power.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

function resolvePort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const val = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(val)) return val;
  }
  return parseInt(process.env.PORT || '3000', 10);
}

const PORT = resolvePort();

async function startServer() {
  const app = express();
  app.use(express.json());

  const configManager = new ConfigManager();
  const cryptoService = new CryptoService(configManager.getConfigDir());
  const vaultDb = new VaultDb(configManager.getConfigDir(), cryptoService);
  const snmpEngine = new SnmpEngine(configManager, vaultDb);

  // 1. Telemetry API
  app.get('/api/telemetry', (_req, res) => {
    res.json({
      telemetry: snmpEngine.getTelemetry(),
      timestamp: Date.now(),
    });
  });

  app.get('/api/telemetry/:id', (req, res) => {
    const data = snmpEngine.getTelemetryById(req.params.id);
    if (!data) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    res.json({ telemetry: data, timestamp: Date.now() });
  });

  // 2. Alerts API
  app.get('/api/alerts', (_req, res) => {
    res.json({ alerts: snmpEngine.getAlerts() });
  });

  app.post('/api/alerts/:id/ack', (req, res) => {
    const ok = snmpEngine.acknowledgeAlert(req.params.id);
    res.json({ success: ok });
  });

  app.post('/api/alerts/:id/dismiss', (req, res) => {
    const ok = snmpEngine.dismissAlert(req.params.id);
    res.json({ success: ok });
  });

  app.post('/api/alerts/clear', (_req, res) => {
    snmpEngine.clearAllAlerts();
    res.json({ success: true });
  });

  // 3. Remote Outlet Control
  app.post('/api/outlets/control', async (req, res) => {
    const { deviceId, outletIndex, action, delaySec } = req.body;
    if (!deviceId || outletIndex === undefined || !action) {
      res.status(400).json({ error: 'Missing required parameters: deviceId, outletIndex, action' });
      return;
    }

    if (!['on', 'off', 'reboot'].includes(action)) {
      res.status(400).json({ error: 'Invalid action. Must be on, off, or reboot.' });
      return;
    }

    const result = await snmpEngine.controlOutlet(
      deviceId,
      Number(outletIndex),
      action,
      delaySec ? Number(delaySec) : 10
    );

    if (!result.success) {
      res.status(400).json(result);
    } else {
      res.json(result);
    }
  });

  // 4. Modular YAML Config Management
  app.get('/api/config', (_req, res) => {
    try {
      const filesInfo = configManager.getFilesList();
      const filesWithContent = filesInfo.map((f) => ({
        ...f,
        rawYaml: configManager.getRawYaml(f.key),
      }));
      const parsed = configManager.getConfig();
      res.json({
        files: filesWithContent,
        config: parsed,
        configDir: configManager.getConfigDir(),
      });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/config', (req, res) => {
    const { fileKey, yamlContent } = req.body;
    if (!fileKey || !['settings', 'profiles', 'devices'].includes(fileKey)) {
      res.status(400).json({ error: 'Valid fileKey (settings, profiles, devices) is required' });
      return;
    }
    if (!yamlContent || typeof yamlContent !== 'string') {
      res.status(400).json({ error: 'yamlContent string is required' });
      return;
    }

    const saveResult = configManager.saveRawYaml(fileKey as 'settings' | 'profiles' | 'devices', yamlContent);
    if (!saveResult.success) {
      res.status(400).json({ error: saveResult.error });
      return;
    }

    snmpEngine.reloadConfig();
    res.json({
      success: true,
      message: `${fileKey}.yaml successfully validated, saved to disk, and SNMP poller reloaded.`,
      config: saveResult.config,
    });
  });

  app.get('/api/config/download/:key', (req, res) => {
    const key = req.params.key as 'settings' | 'profiles' | 'devices';
    if (!['settings', 'profiles', 'devices'].includes(key)) {
      res.status(404).send('Config file not found');
      return;
    }
    const raw = configManager.getRawYaml(key);
    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Content-Disposition', `attachment; filename="${key}.yaml"`);
    res.send(raw);
  });

  // 5. SQLite Encryption Vault & Credentials API (AES-256-GCM)
  app.get('/api/vault/status', (_req, res) => {
    try {
      res.json(vaultDb.getVaultStatus());
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/vault/credentials', (_req, res) => {
    try {
      res.json({ credentials: vaultDb.listCredentials() });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/vault/credentials', (req, res) => {
    const {
      id,
      label,
      snmpVersion,
      community,
      v3Username,
      v3SecurityLevel,
      v3AuthProtocol,
      v3AuthKey,
      v3PrivProtocol,
      v3PrivKey,
      v3Context,
    } = req.body;

    if (!id || !label || !snmpVersion) {
      res.status(400).json({ error: 'id, label, and snmpVersion are required.' });
      return;
    }

    try {
      vaultDb.saveCredential({
        id,
        label,
        snmpVersion,
        community,
        v3Username,
        v3SecurityLevel,
        v3AuthProtocol,
        v3AuthKey,
        v3PrivProtocol,
        v3PrivKey,
        v3Context,
      });
      snmpEngine.reloadConfig();
      res.json({
        success: true,
        message: `Credential "${id}" encrypted with AES-256-GCM and stored in SQLite vault.`,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/vault/credentials/:id', (req, res) => {
    const ok = vaultDb.deleteCredential(req.params.id);
    if (ok) {
      snmpEngine.reloadConfig();
      res.json({ success: true, message: 'Credential deleted successfully.' });
    } else {
      res.status(404).json({ error: 'Credential not found' });
    }
  });

  // Master Key Rotation Entrypoint (Atomic SQLite transaction)
  app.post('/api/vault/rotate-key', (req, res) => {
    const { oldKey, newKey } = req.body;
    if (!oldKey || !newKey) {
      res.status(400).json({ error: 'Both oldKey and newKey are required for key rotation.' });
      return;
    }
    if (newKey.length < 8) {
      res.status(400).json({ error: 'New master key must be at least 8 characters.' });
      return;
    }

    try {
      const result = vaultDb.rotateMasterKey(oldKey, newKey);
      snmpEngine.reloadConfig();
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  });

  // 6. Login & Dashboard User Credentials API (AES-256-GCM + PBKDF2)
  app.get('/api/auth/users', (_req, res) => {
    try {
      res.json({ users: vaultDb.listAuthUsers() });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/auth/users', (req, res) => {
    const { id, username, password, role } = req.body;
    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required.' });
      return;
    }
    try {
      const result = vaultDb.saveAuthUser({ id, username, password, role });
      res.json({
        success: true,
        message: `Login credentials for user "${username}" encrypted with AES-256-GCM and saved to SQLite vault.`,
        id: result.id,
      });
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/auth/users/:id', (req, res) => {
    try {
      const ok = vaultDb.deleteAuthUser(req.params.id);
      if (ok) {
        res.json({ success: true, message: 'User credential deleted successfully.' });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Username and password are required.' });
      return;
    }
    const result = vaultDb.authenticateUser(username, password);
    if (!result.success) {
      res.status(401).json(result);
    } else {
      res.json(result);
    }
  });

  // 7. Ad-Hoc SNMP OID Tester
  const handleSnmpTest = async (req: express.Request, res: express.Response) => {
    const payload: SnmpTestRequest = req.body;
    if (!payload.host || !payload.oid) {
      res.status(400).json({ error: 'Host and OID are required.' });
      return;
    }

    const result = await snmpEngine.testSnmpQuery(payload);
    res.json(result);
  };

  app.post('/api/snmp/test', handleSnmpTest);
  app.post('/api/tools/snmp-test', handleSnmpTest);

  // 6. Lab Simulation Event Trigger (Outage / Overload testing)
  app.post('/api/lab/event', (req, res) => {
    const { deviceId, event } = req.body;
    if (!deviceId || !['toggle_mains', 'toggle_overload', 'toggle_temp'].includes(event)) {
      res.status(400).json({ error: 'Invalid lab event payload' });
      return;
    }

    const result = snmpEngine.triggerLabEvent(deviceId, event);
    res.json(result);
  });

  // 7. Docker Deployment Assets Info
  app.get('/api/docker/info', (_req, res) => {
    res.json({
      dockerfile: `# Lynceus - UPS & PDU SNMP Power Monitor & Remote Control
# Multi-stage lightweight multi-architecture production Docker build (linux/amd64, linux/arm64)
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
LABEL org.opencontainers.image.title="Lynceus"
LABEL org.opencontainers.image.description="Lightweight, self-hosted web dashboard for real-time SNMP monitoring and remote outlet management of UPSs and PDUs."
LABEL org.opencontainers.image.source="https://github.com/spaceplant2/lynceus"

ENV NODE_ENV=production
ENV PORT=3000
ENV CONFIG_DIR=/app/config

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/config ./config

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/telemetry || exit 1

VOLUME ["/app/config"]
CMD ["npx", "tsx", "server.ts"]
`,
      dockerCompose: `---
# Lynceus - UPS & PDU SNMP Power Monitor & Remote Control
# Quick start: docker compose up -d
# Build from source: docker compose build && docker compose up -d

services:
  lynceus:
    # Pre-built container from GitHub Container Registry:
    image: ghcr.io/spaceplant2/lynceus:latest

    # Build from local source alongside pre-built image:
    build:
      context: .
      dockerfile: Dockerfile

    container_name: lynceus
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./config:/app/config
    environment:
      - PORT=3000
      - NODE_ENV=production
      - CONFIG_DIR=/app/config
      # Optional: Master encryption passphrase
      # - LYNCEUS_MASTER_KEY=my-secure-master-passphrase
    # Optional on Linux for direct VLAN / subnet SNMP reachability:
    # network_mode: host
`,
    });
  });

  // Ensure any unmatched /api/* route returns JSON 404 rather than falling into Vite HTML SPA fallback
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Mount Vite or serve static assets
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Lynceus Server] Running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Error]', err);
  process.exit(1);
});
