import React, { useState, useEffect } from 'react';
import {
  Container,
  Terminal,
  Copy,
  Check,
  Download,
  Send,
  Zap,
  Activity,
  Shield,
  Layers,
  HelpCircle,
  Lock,
  Key
} from 'lucide-react';
import { SnmpTestRequest, SnmpTestResult, DockerInfo } from '../types/power.ts';
import { useTheme } from '../context/ThemeContext.tsx';

export const DockerAndTools: React.FC = () => {
  const { theme, mode } = useTheme();
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deployMethod, setDeployMethod] = useState<'run' | 'compose' | 'source'>('compose');

  // SNMP Probe Form State
  const [testHost, setTestHost] = useState<string>('127.0.0.1');
  const [testPort, setTestPort] = useState<number>(161);
  const [testCommunity, setTestCommunity] = useState<string>('public');
  const [testVersion, setTestVersion] = useState<'1' | '2c' | '3'>('2c');
  const [testOid, setTestOid] = useState<string>('1.3.6.1.2.1.1.1.0');
  
  // SNMP v3 Form State
  const [v3User, setV3User] = useState<string>('snmpadmin');
  const [v3Level, setV3Level] = useState<'noAuthNoPriv' | 'authNoPriv' | 'authPriv'>('authPriv');
  const [v3AuthProto, setV3AuthProto] = useState<'sha' | 'md5'>('sha');
  const [v3AuthKey, setV3AuthKey] = useState<string>('');
  const [v3PrivProto, setV3PrivProto] = useState<'aes' | 'des'>('aes');
  const [v3PrivKey, setV3PrivKey] = useState<string>('');
  const [v3Context, setV3Context] = useState<string>('');

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<SnmpTestResult | null>(null);

  useEffect(() => {
    fetch('/api/docker/info')
      .then((res) => {
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        return ct.includes('application/json') ? res.json() : null;
      })
      .then((data) => {
        if (data) setDockerInfo(data);
      })
      .catch((err) => console.warn('Failed to load docker info:', err));
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunSnmpTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const payload: SnmpTestRequest = {
      host: testHost.trim(),
      port: testPort,
      community: testVersion !== '3' ? testCommunity.trim() : undefined,
      version: testVersion,
      oid: testOid.trim(),
      v3: testVersion === '3' ? {
        username: v3User.trim(),
        securityLevel: v3Level,
        authProtocol: v3Level !== 'noAuthNoPriv' ? v3AuthProto : undefined,
        authKey: v3Level !== 'noAuthNoPriv' ? v3AuthKey : undefined,
        privProtocol: v3Level === 'authPriv' ? v3PrivProto : undefined,
        privKey: v3Level === 'authPriv' ? v3PrivKey : undefined,
        context: v3Context.trim() || undefined,
      } : undefined,
    };

    try {
      const res = await fetch('/api/tools/snmp-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: SnmpTestResult = await res.json();
      setTestResult(data);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        oid: testOid,
        error: (err as Error).message || 'Network request failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const quickOidPresets = [
    { label: 'SysDescr (System Description)', oid: '1.3.6.1.2.1.1.1.0' },
    { label: 'SysUpTime (Timeticks)', oid: '1.3.6.1.2.1.1.3.0' },
    { label: 'SysName (Node Name)', oid: '1.3.6.1.2.1.1.5.0' },
    { label: 'APC Battery Status (1.1.1.2.1.1.0)', oid: '1.3.6.1.4.1.318.1.1.1.2.1.1.0' },
    { label: 'APC Battery Capacity % (1.1.1.2.2.1.0)', oid: '1.3.6.1.4.1.318.1.1.1.2.2.1.0' },
    { label: 'APC Output Load % (1.1.1.4.2.3.0)', oid: '1.3.6.1.4.1.318.1.1.1.4.2.3.0' },
    { label: 'APC Input Line VAC (1.1.1.3.2.1.0)', oid: '1.3.6.1.4.1.318.1.1.1.3.2.1.0' },
    { label: 'RFC 1628 Battery Charge % (1.2.4.0)', oid: '1.3.6.1.2.1.33.1.2.4.0' },
    { label: 'RFC 1628 Input Voltage (1.3.3.1.3.1)', oid: '1.3.6.1.2.1.33.1.3.3.1.3.1' },
    { label: 'RFC 1628 Output Load % (1.4.4.1.5.1)', oid: '1.3.6.1.2.1.33.1.4.4.1.5.1' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
        <div>
          <h2 className="text-base font-semibold theme-text-main tracking-tight">
            Docker Deployment & Diagnostic Tools
          </h2>
          <div className="text-xs theme-text-muted mt-0.5 flex items-center gap-2 font-mono">
            <span>Containerized Production Runner</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>Persistent YAML & SQLite Volumes</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>Ad-Hoc SNMP v1/v2c/v3 Probe</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/config/export"
            className="px-3 py-1.5 text-xs font-medium rounded border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 theme-text-main transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Configuration</span>
          </a>
        </div>
      </div>

      {/* 2. Self-Hosting Docker Instructions */}
      <div className="theme-card border theme-border rounded p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 theme-text-main font-semibold text-sm">
            <Container className="w-4 h-4" style={{ color: theme.previewHex }} />
            <span>Self-Hosting with Docker & Docker Compose</span>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            Node 22 Alpine Multi-Stage
          </span>
        </div>

        <p className="text-xs theme-text-muted leading-relaxed">
          Lynceus is built to run directly on your private LAN or inside your datacenter rack. All three YAML configuration
          files (<code className="theme-text-main font-mono">settings.yaml</code>, <code className="theme-text-main font-mono">profiles.yaml</code>, <code className="theme-text-main font-mono">devices.yaml</code>)
          and the encrypted SQLite credentials vault (<code className="theme-text-main font-mono">vault.db</code>) are stored in the persistent volume <code className="theme-text-main font-mono">./config</code>.
        </p>

        {/* Quick Launch Deployment Selector */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium theme-text-main">
              Launch Pre-Built Image (GitHub Container Registry):
            </span>
            <div className="flex items-center gap-1 p-0.5 rounded border theme-border theme-card-subtle text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setDeployMethod('compose')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  deployMethod === 'compose'
                    ? `${theme.badgeBg} ${theme.badgeText} font-semibold`
                    : 'theme-text-muted hover:theme-text-main'
                }`}
              >
                Docker Compose
              </button>
              <button
                type="button"
                onClick={() => setDeployMethod('run')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  deployMethod === 'run'
                    ? `${theme.badgeBg} ${theme.badgeText} font-semibold`
                    : 'theme-text-muted hover:theme-text-main'
                }`}
              >
                Docker Run CLI
              </button>
              <button
                type="button"
                onClick={() => setDeployMethod('source')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  deployMethod === 'source'
                    ? `${theme.badgeBg} ${theme.badgeText} font-semibold`
                    : 'theme-text-muted hover:theme-text-main'
                }`}
              >
                Build From Source
              </button>
            </div>
          </div>

          <div className="relative rounded overflow-hidden border theme-border font-mono text-xs theme-card-subtle">
            <pre className="p-3 text-[12px] theme-text-main overflow-x-auto leading-relaxed">
              <code>
                {deployMethod === 'compose' &&
`# 1. Save docker-compose.yml to your server directory
# 2. Run with pre-built multi-arch image (linux/amd64, linux/arm64):
docker compose up -d

# 3. Access web dashboard locally at:
http://<your-server-ip>:3000`}

                {deployMethod === 'run' &&
`# One-line instant launch with pre-built image from GHCR:
docker run -d \\
  --name lynceus \\
  --restart unless-stopped \\
  -p 3000:3000 \\
  -v $(pwd)/config:/app/config \\
  ghcr.io/spaceplant2/lynceus:latest

# Access web dashboard locally at:
http://<your-server-ip>:3000`}

                {deployMethod === 'source' &&
`# 1. Clone repository to your private host:
git clone https://github.com/spaceplant2/lynceus.git lynceus && cd lynceus

# 2. Build and start container locally from source:
docker compose up -d --build

# 3. Access web dashboard locally at:
http://<your-server-ip>:3000`}
              </code>
            </pre>
            <button
              onClick={() => {
                const cmd =
                  deployMethod === 'compose'
                    ? 'docker compose up -d'
                    : deployMethod === 'run'
                    ? 'docker run -d --name lynceus --restart unless-stopped -p 3000:3000 -v $(pwd)/config:/app/config ghcr.io/spaceplant2/lynceus:latest'
                    : 'git clone https://github.com/spaceplant2/lynceus.git lynceus && cd lynceus && docker compose up -d --build';
                handleCopy(cmd, 'cmd-up');
              }}
              title="Copy command to clipboard"
              className="absolute top-3 right-3 p-1.5 rounded theme-card border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 theme-text-main transition-colors cursor-pointer"
            >
              {copiedKey === 'cmd-up' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Docker Compose File Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          {/* Compose File */}
          <div className="border theme-border rounded theme-card overflow-hidden">
            <div className="px-4 py-2 theme-card-subtle border-b theme-border flex items-center justify-between">
              <span className="text-xs font-mono theme-text-main font-medium">docker-compose.yml</span>
              <button
                onClick={() => handleCopy(dockerInfo?.dockerCompose || '', 'compose')}
                className="text-xs theme-text-muted hover:theme-text-main flex items-center gap-1 font-mono cursor-pointer"
              >
                {copiedKey === 'compose' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'compose' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3 text-[11px] font-mono theme-text-muted overflow-x-auto max-h-64">
              <code>{dockerInfo?.dockerCompose || 'Loading docker-compose.yml...'}</code>
            </pre>
          </div>

          {/* Dockerfile */}
          <div className="border theme-border rounded theme-card overflow-hidden">
            <div className="px-4 py-2 theme-card-subtle border-b theme-border flex items-center justify-between">
              <span className="text-xs font-mono theme-text-main font-medium">Dockerfile</span>
              <button
                onClick={() => handleCopy(dockerInfo?.dockerfile || '', 'dockerfile')}
                className="text-xs theme-text-muted hover:theme-text-main flex items-center gap-1 font-mono cursor-pointer"
              >
                {copiedKey === 'dockerfile' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'dockerfile' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3 text-[11px] font-mono theme-text-muted overflow-x-auto max-h-64">
              <code>{dockerInfo?.dockerfile || 'Loading Dockerfile...'}</code>
            </pre>
          </div>
        </div>

        {/* Volume & Network Guidance */}
        <div className="p-3 theme-card-subtle rounded border theme-border text-xs theme-text-muted space-y-1.5">
          <div className="theme-text-main font-semibold flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" style={{ color: theme.previewHex }} />
            <span>LAN Network & Volume Configuration:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="theme-text-main">Persistent Volumes:</strong> The container maps <code className="theme-text-main font-mono">./config:/app/config</code>. All 3 YAML files and the SQLite encryption vault (<code className="theme-text-main font-mono">vault.db</code>) survive container upgrades.
            </li>
            <li>
              <strong className="theme-text-main">Host Networking:</strong> On Linux hosts where devices reside on distinct VLANs without bridge routing, uncomment <code className="theme-text-main font-mono">network_mode: host</code> in <code className="theme-text-main font-mono">docker-compose.yml</code>.
            </li>
            <li>
              <strong className="theme-text-main">Environment Variable Master Key:</strong> Pass <code className="theme-text-main font-mono">LYNCEUS_MASTER_KEY</code> to decrypt the SQLite database.
            </li>
          </ul>
        </div>
      </div>

      {/* 3. Live SNMP Probe Tool */}
      <div className="p-5 border theme-border rounded theme-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 theme-text-main font-semibold text-sm">
            <Activity className="w-4 h-4" style={{ color: theme.previewHex }} />
            <span>Ad-Hoc SNMP OID Query Probe (v1 / v2c / v3)</span>
          </div>
          <span className="text-xs font-mono theme-text-dim">Direct UDP Poller</span>
        </div>

        <p className="text-xs theme-text-muted leading-relaxed">
          Test any target IP address and OID directly without editing configuration first. Enter the IP, port,
          community string or v3 credentials, and OID to verify live network reachability and inspect returned ASN.1 values.
        </p>

        {/* Test Form */}
        <form onSubmit={handleRunSnmpTest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="theme-text-muted block mb-1 font-medium">Target Host / IP:</label>
              <input
                type="text"
                value={testHost}
                onChange={(e) => setTestHost(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full theme-input border theme-border rounded px-3 py-1.5 theme-text-main font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="theme-text-muted block mb-1 font-medium">SNMP Port:</label>
              <input
                type="number"
                value={testPort}
                onChange={(e) => setTestPort(parseInt(e.target.value, 10))}
                className="w-full theme-input border theme-border rounded px-3 py-1.5 theme-text-main font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="theme-text-muted block mb-1 font-medium">SNMP Protocol Version:</label>
              <select
                value={testVersion}
                onChange={(e) => setTestVersion(e.target.value as '1' | '2c' | '3')}
                className="w-full theme-input border theme-border rounded px-3 py-1.5 theme-text-main font-mono focus:outline-none cursor-pointer"
              >
                <option value="2c">v2c (Standard Community)</option>
                <option value="3">v3 (Encrypted USM AuthPriv)</option>
                <option value="1">v1 (Legacy)</option>
              </select>
            </div>
            <div>
              {testVersion !== '3' ? (
                <>
                  <label className="theme-text-muted block mb-1 font-medium">Community String:</label>
                  <input
                    type="text"
                    value={testCommunity}
                    onChange={(e) => setTestCommunity(e.target.value)}
                    placeholder="public"
                    className="w-full theme-input border theme-border rounded px-3 py-1.5 theme-text-main font-mono focus:outline-none"
                  />
                </>
              ) : (
                <>
                  <label className="theme-text-muted block mb-1 font-medium">v3 Security Level:</label>
                  <select
                    value={v3Level}
                    onChange={(e) => setV3Level(e.target.value as 'noAuthNoPriv' | 'authNoPriv' | 'authPriv')}
                    className="w-full theme-input border theme-border rounded px-3 py-1.5 theme-text-main font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="authPriv">authPriv (Auth+Priv)</option>
                    <option value="authNoPriv">authNoPriv</option>
                    <option value="noAuthNoPriv">noAuthNoPriv</option>
                  </select>
                </>
              )}
            </div>
          </div>

          {/* SNMP v3 fields if version 3 */}
          {testVersion === '3' && (
            <div className="p-3 theme-card-subtle rounded border theme-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="theme-text-muted block mb-1 font-medium">v3 Username:</label>
                <input
                  type="text"
                  value={v3User}
                  onChange={(e) => setV3User(e.target.value)}
                  className="w-full theme-input border theme-border rounded px-3 py-1.5 theme-text-main font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="theme-text-muted block mb-1 font-medium">Auth Protocol / Passphrase:</label>
                <div className="flex gap-1">
                  <select
                    value={v3AuthProto}
                    onChange={(e) => setV3AuthProto(e.target.value as 'sha' | 'md5')}
                    className="theme-input border theme-border rounded px-2 py-1.5 theme-text-main font-mono text-[11px] cursor-pointer"
                  >
                    <option value="sha">SHA</option>
                    <option value="md5">MD5</option>
                  </select>
                  <input
                    type="password"
                    value={v3AuthKey}
                    onChange={(e) => setV3AuthKey(e.target.value)}
                    placeholder="Auth key"
                    className="flex-1 theme-input border theme-border rounded px-2 py-1.5 theme-text-main font-mono text-[11px] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="theme-text-muted block mb-1 font-medium">Priv Protocol / Passphrase:</label>
                <div className="flex gap-1">
                  <select
                    value={v3PrivProto}
                    onChange={(e) => setV3PrivProto(e.target.value as 'aes' | 'des')}
                    className="theme-input border theme-border rounded px-2 py-1.5 theme-text-main font-mono text-[11px] cursor-pointer"
                  >
                    <option value="aes">AES</option>
                    <option value="des">DES</option>
                  </select>
                  <input
                    type="password"
                    value={v3PrivKey}
                    onChange={(e) => setV3PrivKey(e.target.value)}
                    placeholder="Priv key"
                    className="flex-1 theme-input border theme-border rounded px-2 py-1.5 theme-text-main font-mono text-[11px] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="theme-text-muted block mb-1 font-medium">v3 Context (Optional):</label>
                <input
                  type="text"
                  value={v3Context}
                  onChange={(e) => setV3Context(e.target.value)}
                  placeholder="Context"
                  className="w-full theme-input border theme-border rounded px-3 py-1.5 theme-text-main font-mono focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="text-xs">
            <div className="flex items-center justify-between mb-1">
              <label className="theme-text-muted font-medium">Object Identifier (OID):</label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] theme-text-dim">Preset:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) setTestOid(e.target.value);
                  }}
                  defaultValue=""
                  className="theme-card-subtle border theme-border text-[11px] rounded px-2 py-0.5 font-mono focus:outline-none cursor-pointer"
                  style={{ color: theme.previewHex }}
                >
                  <option value="" disabled>Select standard OID...</option>
                  {quickOidPresets.map((p, idx) => (
                    <option key={idx} value={p.oid}>
                      {p.label} ({p.oid})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={testOid}
                onChange={(e) => setTestOid(e.target.value)}
                placeholder="1.3.6.1.2.1.1.1.0"
                className="flex-1 theme-input border theme-border rounded px-3 py-1.5 theme-text-main font-mono focus:outline-none"
              />
              <button
                type="submit"
                disabled={isTesting}
                className={`px-4 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${theme.primaryButtonClass}`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTesting ? 'Querying...' : 'Query OID'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Test Result Display */}
        {testResult && (
          <div
            className={`p-4 rounded border text-xs font-mono space-y-2 ${
              testResult.success
                ? 'theme-card-subtle border-emerald-500/40'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold theme-text-main flex items-center gap-1.5">
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Activity className="w-4 h-4 text-rose-500" />
                )}
                <span>{testResult.success ? 'SNMP Response Received' : 'Query Failed'}</span>
              </span>
              {testResult.responseTimeMs !== undefined && (
                <span className="text-[11px] theme-text-dim">
                  Latency: {testResult.responseTimeMs} ms
                </span>
              )}
            </div>

            <div className="space-y-1 text-[11px]">
              <div>
                <span className="theme-text-dim">OID Queried: </span>
                <span style={{ color: theme.previewHex }} className="font-semibold">{testResult.oid}</span>
              </div>
              {testResult.type && (
                <div>
                  <span className="theme-text-dim">ASN.1 Type: </span>
                  <span className="text-amber-600 dark:text-amber-300 font-semibold">{testResult.type}</span>
                </div>
              )}
              {testResult.value !== undefined && (
                <div>
                  <span className="theme-text-dim">Value Returned: </span>
                  <span className="theme-text-main font-bold theme-card px-2 py-0.5 rounded border theme-border">
                    {testResult.value}
                  </span>
                </div>
              )}
              {testResult.error && (
                <div>
                  <span className="text-rose-500">Error: </span>
                  <span>{testResult.error}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
