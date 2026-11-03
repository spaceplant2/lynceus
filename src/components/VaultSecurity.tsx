import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Lock,
  Unlock,
  RotateCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Database,
  Eye,
  EyeOff,
  Cpu,
  Layers,
  Check,
  Copy,
  UserCheck,
  UserPlus,
  Users,
  LogIn,
  KeyRound
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  VaultStatus,
  VaultCredentialItem,
  VaultUserItem,
  KeyRotationResult,
  SnmpV3Config
} from '../types/power.ts';

export const VaultSecurity: React.FC = () => {
  const { theme, mode } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<'snmp' | 'users' | 'arch'>('snmp');
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [credentials, setCredentials] = useState<VaultCredentialItem[]>([]);
  const [users, setUsers] = useState<VaultUserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Key Rotation Modal state
  const [rotationModalOpen, setRotationModalOpen] = useState<boolean>(false);
  const [oldKey, setOldKey] = useState<string>('');
  const [newKey, setNewKey] = useState<string>('');
  const [confirmNewKey, setConfirmNewKey] = useState<string>('');
  const [isRotating, setIsRotating] = useState<boolean>(false);

  // Add/Edit SNMP Credential Modal state
  const [addCredModalOpen, setAddCredModalOpen] = useState<boolean>(false);
  const [credId, setCredId] = useState<string>('');
  const [credLabel, setCredLabel] = useState<string>('');
  const [credVersion, setCredVersion] = useState<'1' | '2c' | '3'>('3');
  const [community, setCommunity] = useState<string>('public');
  const [v3User, setV3User] = useState<string>('snmpadmin');
  const [v3Level, setV3Level] = useState<'noAuthNoPriv' | 'authNoPriv' | 'authPriv'>('authPriv');
  const [v3AuthProto, setV3AuthProto] = useState<'sha' | 'md5'>('sha');
  const [v3AuthKey, setV3AuthKey] = useState<string>('');
  const [v3PrivProto, setV3PrivProto] = useState<'aes' | 'des'>('aes');
  const [v3PrivKey, setV3PrivKey] = useState<string>('');
  const [v3Context, setV3Context] = useState<string>('');
  const [isSavingCred, setIsSavingCred] = useState<boolean>(false);

  // Add/Edit User Account Modal state
  const [addUserModalOpen, setAddUserModalOpen] = useState<boolean>(false);
  const [userUsername, setUserUsername] = useState<string>('');
  const [userPassword, setUserPassword] = useState<string>('');
  const [userRole, setUserRole] = useState<'admin' | 'operator' | 'viewer'>('operator');
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);

  // Test Authentication Drawer state
  const [testLoginUsername, setTestLoginUsername] = useState<string>('admin');
  const [testLoginPassword, setTestLoginPassword] = useState<string>('lynceus2026');
  const [testLoginResult, setTestLoginResult] = useState<{
    success: boolean;
    message: string;
    user?: { id: string; username: string; role: string };
  } | null>(null);
  const [isTestingLogin, setIsTestingLogin] = useState<boolean>(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchVaultData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, credsRes, usersRes] = await Promise.allSettled([
        fetch('/api/vault/status'),
        fetch('/api/vault/credentials'),
        fetch('/api/auth/users'),
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const ct = statusRes.value.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          setVaultStatus(await statusRes.value.json());
        }
      }
      if (credsRes.status === 'fulfilled' && credsRes.value.ok) {
        const ct = credsRes.value.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await credsRes.value.json();
          setCredentials(data.credentials || []);
        }
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const ct = usersRes.value.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await usersRes.value.json();
          setUsers(data.users || []);
        }
      }
    } catch {
      // Gracefully handle cold start
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultData();
  }, []);

  const handleCopyRef = (id: string) => {
    navigator.clipboard.writeText(`credentialId: "${id}"`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExecuteKeyRotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newKey !== confirmNewKey) {
      setMessage({ type: 'error', text: 'New master keys do not match.' });
      return;
    }
    if (newKey.length < 8) {
      setMessage({ type: 'error', text: 'New master key must be at least 8 characters.' });
      return;
    }

    setIsRotating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/vault/rotate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldKey, newKey }),
      });
      const data: KeyRotationResult & { error?: string } = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: `${data.message} (Rotated ${data.recordsRotated} records: ${data.snmpRecordsRotated ?? 0} SNMP, ${data.userRecordsRotated ?? 0} Login users to Key Version ${data.newVersion}).`,
        });
        setRotationModalOpen(false);
        setOldKey('');
        setNewKey('');
        setConfirmNewKey('');
        fetchVaultData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Key rotation failed.' });
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsRotating(false);
    }
  };

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credId || !credLabel) {
      setMessage({ type: 'error', text: 'Credential ID and Label are required.' });
      return;
    }

    setIsSavingCred(true);
    setMessage(null);
    try {
      const res = await fetch('/api/vault/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: credId.trim(),
          label: credLabel.trim(),
          snmpVersion: credVersion,
          community: credVersion !== '3' ? community : undefined,
          v3Username: credVersion === '3' ? v3User : undefined,
          v3SecurityLevel: credVersion === '3' ? v3Level : undefined,
          v3AuthProtocol: credVersion === '3' && v3Level !== 'noAuthNoPriv' ? v3AuthProto : undefined,
          v3AuthKey: credVersion === '3' && v3Level !== 'noAuthNoPriv' ? v3AuthKey : undefined,
          v3PrivProtocol: credVersion === '3' && v3Level === 'authPriv' ? v3PrivProto : undefined,
          v3PrivKey: credVersion === '3' && v3Level === 'authPriv' ? v3PrivKey : undefined,
          v3Context: credVersion === '3' ? v3Context : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setAddCredModalOpen(false);
        setCredId('');
        setCredLabel('');
        setV3AuthKey('');
        setV3PrivKey('');
        fetchVaultData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save credential.' });
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsSavingCred(false);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!window.confirm(`Delete encrypted credential "${id}" from SQLite vault?`)) return;
    try {
      const res = await fetch(`/api/vault/credentials/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: `Credential "${id}" deleted.` });
        fetchVaultData();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete.' });
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUsername || !userPassword) {
      setMessage({ type: 'error', text: 'Username and password are required.' });
      return;
    }

    setIsSavingUser(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userUsername.trim(),
          password: userPassword,
          role: userRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setAddUserModalOpen(false);
        setUserUsername('');
        setUserPassword('');
        fetchVaultData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save login account.' });
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Delete login user "${name}" from SQLite vault?`)) return;
    try {
      const res = await fetch(`/api/auth/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Login user "${name}" deleted.` });
        fetchVaultData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete user.' });
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingLogin(true);
    setTestLoginResult(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testLoginUsername,
          password: testLoginPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestLoginResult({
          success: true,
          message: `Authentication successful! Role: "${data.user?.role}". PBKDF2 hash verified and AES-256-GCM record confirmed.`,
          user: data.user,
        });
      } else {
        setTestLoginResult({
          success: false,
          message: data.error || 'Authentication rejected: Invalid username or password.',
        });
      }
    } catch (err: unknown) {
      setTestLoginResult({
        success: false,
        message: (err as Error).message,
      });
    } finally {
      setIsTestingLogin(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
        <div>
          <h2 className="text-base font-semibold theme-text-main tracking-tight">
            Security Vault, SNMP v3 & Login Credentials
          </h2>
          <div className="text-xs theme-text-muted mt-0.5 flex items-center gap-2 font-mono">
            <span>AES-256-GCM Per-Record Encryption</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>SQLite Storage of Ciphertext</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>Atomic Master Key Rotation</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRotationModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 theme-text-main transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-500" />
            <span>Rotate Master Key</span>
          </button>

          {activeSubTab === 'snmp' ? (
            <button
              onClick={() => setAddCredModalOpen(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer ${theme.primaryButtonClass}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add SNMP Credential</span>
            </button>
          ) : (
            <button
              onClick={() => setAddUserModalOpen(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer ${theme.primaryButtonClass}`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Login User</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Status Message */}
      {message && (
        <div
          className={`p-3 rounded text-xs flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="theme-text-muted hover:theme-text-main underline text-xs ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Security Vault Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Master Key Status */}
        <div className="p-4 rounded theme-card border shadow-xs">
          <div className="flex items-center justify-between text-xs theme-text-muted mb-1">
            <span className="uppercase font-mono text-[10px] theme-text-dim">Master Key</span>
            <Key className="w-4 h-4" style={{ color: theme.previewHex }} />
          </div>
          <div className="text-lg font-bold font-mono theme-text-main mt-1">
            Version {vaultStatus?.activeKeyVersion || 1}
          </div>
          <div className="text-[11px] theme-text-muted font-mono mt-1 truncate" title={vaultStatus?.keyFingerprint}>
            {vaultStatus?.keyFingerprint || 'SHA256:Derived'}
          </div>
          <span className="inline-block mt-2 text-[10px] font-mono" style={{ color: theme.previewHex }}>
            Source: {vaultStatus?.masterKeySource === 'env' ? 'ENV: LYNCEUS_MASTER_KEY' : 'Secure Keyfile'}
          </span>
        </div>

        {/* Card 2: Cipher Algorithm */}
        <div className="p-4 rounded theme-card border shadow-xs">
          <div className="flex items-center justify-between text-xs theme-text-muted mb-1">
            <span className="uppercase font-mono text-[10px] theme-text-dim">Encryption Algorithm</span>
            <Lock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-bold font-mono theme-text-main mt-1">
            AES-256-GCM
          </div>
          <p className="text-[11px] theme-text-muted font-mono mt-1">
            96-bit random IV / 128-bit Tag
          </p>
          <span className="inline-block mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
            Authenticated Encryption
          </span>
        </div>

        {/* Card 3: SQLite Storage */}
        <div className="p-4 rounded theme-card border shadow-xs">
          <div className="flex items-center justify-between text-xs theme-text-muted mb-1">
            <span className="uppercase font-mono text-[10px] theme-text-dim">Ciphertext Database</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg font-bold font-mono theme-text-main mt-1">
            SQLite Sync
          </div>
          <p className="text-[11px] theme-text-muted font-mono mt-1 truncate" title={vaultStatus?.sqlitePath}>
            vault.db
          </p>
          <span className="inline-block mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
            {vaultStatus?.credentialsCount || 0} SNMP / {vaultStatus?.usersCount || 0} User Records
          </span>
        </div>

        {/* Card 4: Last Rotated */}
        <div className="p-4 rounded theme-card border shadow-xs">
          <div className="flex items-center justify-between text-xs theme-text-muted mb-1">
            <span className="uppercase font-mono text-[10px] theme-text-dim">Rotation Status</span>
            <RotateCw className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold font-mono theme-text-main mt-1">
            {vaultStatus?.lastRotatedAt
              ? new Date(vaultStatus.lastRotatedAt).toLocaleDateString()
              : 'Initial Key'}
          </div>
          <p className="text-[11px] theme-text-muted font-mono mt-1">
            {vaultStatus?.lastRotatedAt
              ? new Date(vaultStatus.lastRotatedAt).toLocaleTimeString()
              : 'Zero downtime rotation ready'}
          </p>
          <span className="inline-block mt-2 text-[10px] theme-text-dim font-mono">
            Atomic transaction verified
          </span>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b theme-border">
        <button
          onClick={() => setActiveSubTab('snmp')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'snmp'
              ? `${theme.activeTabBorder} ${theme.badgeBg} font-semibold`
              : 'border-transparent theme-text-muted hover:theme-text-main hover:bg-slate-100 dark:hover:bg-slate-850'
          }`}
        >
          <Shield className="w-3.5 h-3.5" style={{ color: activeSubTab === 'snmp' ? theme.previewHex : undefined }} />
          <span className="font-semibold">SNMP Credentials & Communities</span>
          <span className="px-1.5 py-0.2 rounded theme-card-subtle text-[10px] font-mono theme-text-muted">
            {credentials.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'users'
              ? `${theme.activeTabBorder} ${theme.badgeBg} font-semibold`
              : 'border-transparent theme-text-muted hover:theme-text-main hover:bg-slate-100 dark:hover:bg-slate-850'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-semibold">Login Accounts (Encrypted in SQLite)</span>
          <span className="px-1.5 py-0.2 rounded theme-card-subtle text-[10px] font-mono theme-text-muted">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('arch')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'arch'
              ? `${theme.activeTabBorder} ${theme.badgeBg} font-semibold`
              : 'border-transparent theme-text-muted hover:theme-text-main hover:bg-slate-100 dark:hover:bg-slate-850'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold">Security Architecture & Key Rotation</span>
        </button>
      </div>

      {/* Tab 1: SNMP Credentials Table */}
      {activeSubTab === 'snmp' && (
        <div className="space-y-4">
          <div className="theme-card border rounded overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b theme-border theme-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-sm theme-text-main">Stored Encrypted SNMP Credentials</span>
                <p className="text-xs theme-text-muted font-mono mt-0.5">
                  Ciphertext is stored in SQLite; passphrases and community names are decrypted strictly in-memory during SNMP polling.
                </p>
              </div>
              <span className="text-xs theme-text-muted font-mono">
                {credentials.length} Active Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b theme-border theme-text-dim font-mono uppercase text-[10px] theme-card-subtle">
                    <th className="py-2.5 px-4">Credential ID & Reference</th>
                    <th className="py-2.5 px-4">Label</th>
                    <th className="py-2.5 px-4 w-24">Version</th>
                    <th className="py-2.5 px-4">Security Parameters (Encrypted in SQLite)</th>
                    <th className="py-2.5 px-4 w-28 text-center">Key Version</th>
                    <th className="py-2.5 px-4 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border font-sans">
                  {credentials.map((cred) => {
                    const isV3 = cred.snmpVersion === '3';

                    return (
                      <tr key={cred.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/30 transition-colors">
                        {/* ID */}
                        <td className="py-3 px-4 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium" style={{ color: theme.previewHex }}>{cred.id}</span>
                            <button
                              onClick={() => handleCopyRef(cred.id)}
                              title="Copy YAML reference snippet"
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded theme-text-muted hover:theme-text-main transition-colors cursor-pointer"
                            >
                              {copiedId === cred.id ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] theme-text-dim">
                            {new Date(cred.updatedAt).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Label */}
                        <td className="py-3 px-4 font-medium theme-text-main">
                          {cred.label}
                        </td>

                        {/* SNMP Version */}
                        <td className="py-3 px-4 font-mono font-bold theme-text-main">
                          {isV3 ? (
                            <span className={`px-2 py-0.5 rounded ${theme.badgeBg} ${theme.badgeText} text-[11px]`}>
                              SNMP v3
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded theme-card-subtle theme-text-muted text-[11px]">
                              v{cred.snmpVersion}
                            </span>
                          )}
                        </td>

                        {/* Security Details */}
                        <td className="py-3 px-4 font-mono text-[11px] theme-text-muted">
                          {isV3 ? (
                            <div className="space-y-0.5">
                              <div>
                                <span className="theme-text-dim">User: </span>
                                <span className="theme-text-main font-semibold">{cred.v3Username}</span>
                                <span className="theme-text-dim ml-2">Level: </span>
                                <span className="text-amber-600 dark:text-amber-300 font-semibold">{cred.v3SecurityLevel}</span>
                              </div>
                              <div className="text-[10px] theme-text-dim flex items-center gap-3">
                                {cred.hasV3AuthKey && (
                                  <span>Auth: {cred.v3AuthProtocol?.toUpperCase()} (Encrypted AES-256-GCM)</span>
                                )}
                                {cred.hasV3PrivKey && (
                                  <span>Privacy: {cred.v3PrivProtocol?.toUpperCase()} (Encrypted AES-256-GCM)</span>
                                )}
                                {cred.v3Context && <span>Context: "{cred.v3Context}"</span>}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="theme-text-dim">Community Name:</span>
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                                <Lock className="w-3 h-3 text-emerald-500" />
                                <span>AES-256-GCM Ciphertext (96-bit IV)</span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Key Version */}
                        <td className="py-3 px-4 text-center font-mono text-[11px] theme-text-muted">
                          v{cred.keyVersion}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteCredential(cred.id)}
                            title="Delete encrypted credential"
                            className="p-1.5 theme-text-muted hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* YAML Mapping Guide Note */}
          <div className="p-4 theme-card-subtle rounded border theme-border text-xs theme-text-muted space-y-2">
            <div className="flex items-center gap-2 theme-text-main font-semibold font-mono">
              <Layers className="w-4 h-4" style={{ color: theme.previewHex }} />
              <span>How to reference encrypted credentials in devices.yaml:</span>
            </div>
            <p>
              Instead of storing plaintext communities or SNMP v3 passphrases inside <code className="theme-text-main font-mono">devices.yaml</code>, reference the credential's unique ID:
            </p>
            <div className="theme-card p-3 rounded font-mono text-[11px] theme-text-main border theme-border">
              <pre>{`devices:
  - id: ups-datacenter-01
    name: "APC Smart-UPS RT 3000 (Rack 1A)"
    host: "192.168.10.15"
    snmpVersion: "3"
    credentialId: "cred-v3-admin" # Resolves encrypted SHA/AES keys from SQLite vault!
    profile: apc-powernet-ups

  - id: pdu-rack-alpha
    name: "APC AP7920B Switched PDU"
    host: "192.168.10.20"
    snmpVersion: "2c"
    credentialId: "cred-private-v2" # Resolves encrypted community from SQLite vault!
    profile: apc-switched-pdu`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Login Accounts & Authentication */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          {/* User accounts table */}
          <div className="theme-card border rounded overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b theme-border theme-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-sm theme-text-main">Dashboard Login Credentials</span>
                <p className="text-xs theme-text-muted font-mono mt-0.5">
                  Stored in SQLite with PBKDF2-SHA512 verification hashes + AES-256-GCM per-record encryption for seamless master key rotation.
                </p>
              </div>
              <span className="text-xs theme-text-muted font-mono">
                {users.length} Authorized Accounts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b theme-border theme-text-dim font-mono uppercase text-[10px] theme-card-subtle">
                    <th className="py-2.5 px-4">User ID & Username</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Password Encryption in SQLite</th>
                    <th className="py-2.5 px-4 w-28 text-center">Key Version</th>
                    <th className="py-2.5 px-4">Created Date</th>
                    <th className="py-2.5 px-4 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border font-sans">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <span className="theme-text-main font-bold">{u.username}</span>
                        <div className="text-[10px] theme-text-dim">{u.id}</div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                            u.role === 'admin'
                              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
                              : u.role === 'operator'
                              ? `${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText} border`
                              : 'theme-card-subtle theme-text-muted'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] theme-text-muted">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <Lock className="w-3.5 h-3.5 text-emerald-500" />
                          <span>AES-256-GCM Ciphertext + PBKDF2 (100k iters)</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-[11px] theme-text-muted">
                        v{u.keyVersion}
                      </td>

                      <td className="py-3 px-4 theme-text-muted font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          disabled={u.username === 'admin'}
                          title={u.username === 'admin' ? 'Primary admin cannot be deleted' : 'Delete user'}
                          className={`p-1.5 rounded transition-colors ${
                            u.username === 'admin'
                              ? 'theme-text-dim opacity-40 cursor-not-allowed'
                              : 'theme-text-muted hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Authentication Testing & Verification Box */}
          <div className="p-5 border theme-border rounded theme-card shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4" style={{ color: theme.previewHex }} />
              <h3 className="text-sm font-semibold theme-text-main">
                Verify Login Credentials Authentication
              </h3>
            </div>
            <p className="text-xs theme-text-muted mb-4">
              Test credentials against the SQLite vault to verify that the stored ciphertext and password verification hash correctly validate in real-time.
            </p>

            <form onSubmit={handleTestLogin} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="theme-text-muted block mb-1">Username:</label>
                <input
                  type="text"
                  required
                  value={testLoginUsername}
                  onChange={(e) => setTestLoginUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="theme-text-muted block mb-1">Password:</label>
                <input
                  type="password"
                  required
                  value={testLoginPassword}
                  onChange={(e) => setTestLoginPassword(e.target.value)}
                  placeholder="lynceus2026"
                  className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isTestingLogin}
                  className={`w-full px-4 py-2 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${theme.primaryButtonClass}`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isTestingLogin ? 'Verifying...' : 'Test Authenticate'}</span>
                </button>
              </div>
            </form>

            {testLoginResult && (
              <div
                className={`mt-4 p-3 rounded text-xs border flex items-center gap-2 ${
                  testLoginResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-800 dark:text-rose-200'
                }`}
              >
                {testLoginResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span>{testLoginResult.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Security Architecture & Reference */}
      {activeSubTab === 'arch' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs theme-text-muted">
          <div className="p-5 border theme-border rounded theme-card space-y-3 shadow-xs">
            <div className="flex items-center gap-2 theme-text-main font-semibold text-sm">
              <Key className="w-4 h-4" style={{ color: theme.previewHex }} />
              <span>Master Key & AES-256-GCM Design</span>
            </div>
            <p className="leading-relaxed">
              Lynceus protects both SNMP credentials (v1/v2c communities and v3 passphrases) and login user credentials using an envelope encryption scheme:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="theme-text-main">Master Key:</strong> Sourced at startup from the <code className="font-mono font-semibold" style={{ color: theme.previewHex }}>LYNCEUS_MASTER_KEY</code> (or <code className="font-mono">MASTER_KEY</code>) environment variable. A 256-bit key is derived using SHA-256.
              </li>
              <li>
                <strong className="theme-text-main">Per-Record IVs:</strong> Every single record stored in SQLite is encrypted with a cryptographically secure, non-reusable 12-byte (96-bit) IV generated via <code className="font-mono">crypto.randomBytes(12)</code>.
              </li>
              <li>
                <strong className="theme-text-main">Tamper Verification:</strong> AES-256-GCM produces a 128-bit authentication tag. Any tampering with SQLite records causes instant decryption failure, preventing unauthorized modification.
              </li>
              <li>
                <strong className="theme-text-main">In-Memory Decryption:</strong> Plaintext community names and keys are never saved to disk. They are decrypted strictly in Node.js heap memory at the moment an SNMP UDP session is established.
              </li>
            </ul>
          </div>

          <div className="p-5 border theme-border rounded theme-card space-y-3 shadow-xs">
            <div className="flex items-center gap-2 theme-text-main font-semibold text-sm">
              <RotateCw className="w-4 h-4 text-amber-500" />
              <span>Atomic Master Key Rotation Mechanism</span>
            </div>
            <p className="leading-relaxed">
              When an administrator triggers a key rotation:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                <strong className="theme-text-main">Integrity Pre-Check:</strong> All SNMP records and login credentials in the SQLite database are decrypted in memory using the active key to verify tag integrity.
              </li>
              <li>
                <strong className="theme-text-main">Fresh Re-Encryption:</strong> Every field is re-encrypted using the new master key with a brand new, random 12-byte IV and incremented key version.
              </li>
              <li>
                <strong className="theme-text-main">ACID SQLite Transaction:</strong> All records and metadata are written in a single SQLite transaction (<code className="font-mono" style={{ color: theme.previewHex }}>BEGIN TRANSACTION ... COMMIT</code>). If any error occurs, changes are rolled back with zero data corruption.
              </li>
              <li>
                <strong className="theme-text-main">Live Runtime Promotion:</strong> The active key in memory is promoted immediately, allowing SNMP pollers to continue without downtime.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* 5. Key Rotation Modal */}
      {rotationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md theme-card border rounded-lg shadow-2xl p-6 theme-text-main animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-full">
                <RotateCw className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold theme-text-main">
                  Atomic Master Key Rotation
                </h3>
                <span className="text-xs theme-text-muted font-mono">
                  AES-256-GCM Re-Encryption Engine
                </span>
              </div>
            </div>

            <p className="text-xs theme-text-muted mb-4 leading-relaxed">
              This routine decrypts all stored SNMP communities, v3 passphrases, and dashboard login credentials with the current key, verifies authentication tags, generates fresh 12-byte random IVs, and re-encrypts all records under your new key in a single ACID transaction.
            </p>

            <form onSubmit={handleExecuteKeyRotation} className="space-y-3 text-xs">
              <div>
                <label className="theme-text-muted block mb-1">Current Master Key:</label>
                <input
                  type="password"
                  required
                  value={oldKey}
                  onChange={(e) => setOldKey(e.target.value)}
                  placeholder="Enter active master passphrase..."
                  className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="theme-text-muted block mb-1">New Master Key:</label>
                <input
                  type="password"
                  required
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Enter new 256-bit passphrase (min 8 chars)..."
                  className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="theme-text-muted block mb-1">Confirm New Master Key:</label>
                <input
                  type="password"
                  required
                  value={confirmNewKey}
                  onChange={(e) => setConfirmNewKey(e.target.value)}
                  placeholder="Confirm new passphrase..."
                  className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-800 dark:text-amber-200 mt-2">
                Remember to update your <code className="font-mono font-bold">LYNCEUS_MASTER_KEY</code> environment variable in your Docker container or server configuration so Lynceus can decrypt the vault upon restart.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setRotationModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium theme-text-muted hover:theme-text-main rounded border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRotating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                  <span>{isRotating ? 'Rotating Vault...' : 'Rotate Master Key'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add/Edit SNMP Credential Modal */}
      {addCredModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg theme-card border rounded-lg shadow-2xl p-6 theme-text-main max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b theme-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5" style={{ color: theme.previewHex }} />
                <h3 className="text-base font-semibold theme-text-main">
                  Add Encrypted SNMP Credential
                </h3>
              </div>
              <button
                onClick={() => setAddCredModalOpen(false)}
                className="theme-text-dim hover:theme-text-main text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCredential} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="theme-text-muted block mb-1">Unique Credential ID:</label>
                  <input
                    type="text"
                    required
                    value={credId}
                    onChange={(e) => setCredId(e.target.value)}
                    placeholder="e.g., cred-pdu-rack1"
                    className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="theme-text-muted block mb-1">SNMP Protocol Version:</label>
                  <select
                    value={credVersion}
                    onChange={(e) => setCredVersion(e.target.value as '1' | '2c' | '3')}
                    className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="3">SNMP v3 (Encrypted USM)</option>
                    <option value="2c">SNMP v2c (Community)</option>
                    <option value="1">SNMP v1 (Legacy Community)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="theme-text-muted block mb-1">Description / Label:</label>
                <input
                  type="text"
                  required
                  value={credLabel}
                  onChange={(e) => setCredLabel(e.target.value)}
                  placeholder="e.g., Core Rack 1A PDU Switched Admin"
                  className="w-full theme-input border rounded px-3 py-2 focus:outline-none"
                />
              </div>

              {/* SNMP v1 / v2c Community */}
              {credVersion !== '3' && (
                <div className="p-3 theme-card-subtle rounded border theme-border">
                  <label className="theme-text-main block mb-1 font-medium">
                    Community String (Encrypted with AES-256-GCM):
                  </label>
                  <input
                    type="password"
                    required
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                    placeholder="e.g., public or private"
                    className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none"
                  />
                  <span className="text-[10px] theme-text-dim mt-1 block">
                    The community will be encrypted in SQLite and decrypted strictly in memory when polling.
                  </span>
                </div>
              )}

              {/* SNMP v3 USM Configuration */}
              {credVersion === '3' && (
                <div className="p-3 theme-card-subtle rounded border theme-border space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="theme-text-main block mb-1 font-medium">v3 Username:</label>
                      <input
                        type="text"
                        required
                        value={v3User}
                        onChange={(e) => setV3User(e.target.value)}
                        placeholder="snmpadmin"
                        className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="theme-text-main block mb-1 font-medium">Security Level:</label>
                      <select
                        value={v3Level}
                        onChange={(e) => setV3Level(e.target.value as 'noAuthNoPriv' | 'authNoPriv' | 'authPriv')}
                        className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none cursor-pointer"
                      >
                        <option value="authPriv">authPriv (Auth + Encryption)</option>
                        <option value="authNoPriv">authNoPriv (Auth Only)</option>
                        <option value="noAuthNoPriv">noAuthNoPriv (No Security)</option>
                      </select>
                    </div>
                  </div>

                  {/* Authentication details */}
                  {v3Level !== 'noAuthNoPriv' && (
                    <div className="grid grid-cols-2 gap-3 border-t theme-border pt-3">
                      <div>
                        <label className="theme-text-muted block mb-1">Auth Protocol:</label>
                        <select
                          value={v3AuthProto}
                          onChange={(e) => setV3AuthProto(e.target.value as 'sha' | 'md5')}
                          className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none cursor-pointer"
                        >
                          <option value="sha">SHA (Recommended)</option>
                          <option value="md5">MD5</option>
                        </select>
                      </div>
                      <div>
                        <label className="theme-text-muted block mb-1">Auth Passphrase:</label>
                        <input
                          type="password"
                          value={v3AuthKey}
                          onChange={(e) => setV3AuthKey(e.target.value)}
                          placeholder="Min 8 characters..."
                          className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Privacy / Encryption details */}
                  {v3Level === 'authPriv' && (
                    <div className="grid grid-cols-2 gap-3 border-t theme-border pt-3">
                      <div>
                        <label className="theme-text-muted block mb-1">Privacy Protocol:</label>
                        <select
                          value={v3PrivProto}
                          onChange={(e) => setV3PrivProto(e.target.value as 'aes' | 'des')}
                          className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none cursor-pointer"
                        >
                          <option value="aes">AES (Recommended)</option>
                          <option value="des">DES</option>
                        </select>
                      </div>
                      <div>
                        <label className="theme-text-muted block mb-1">Privacy Passphrase:</label>
                        <input
                          type="password"
                          value={v3PrivKey}
                          onChange={(e) => setV3PrivKey(e.target.value)}
                          placeholder="Min 8 characters..."
                          className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Optional Context */}
                  <div className="border-t theme-border pt-3">
                    <label className="theme-text-muted block mb-1">Context Name (Optional):</label>
                    <input
                      type="text"
                      value={v3Context}
                      onChange={(e) => setV3Context(e.target.value)}
                      placeholder="e.g., vlan100 or leave empty"
                      className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setAddCredModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium theme-text-muted hover:theme-text-main rounded border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCred}
                  className={`px-4 py-2 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer ${theme.primaryButtonClass}`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isSavingCred ? 'Encrypting & Saving...' : 'Save Encrypted Credential'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Add User Account Modal */}
      {addUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md theme-card border rounded-lg shadow-2xl p-6 theme-text-main animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b theme-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-semibold theme-text-main">
                  Add Encrypted Login User
                </h3>
              </div>
              <button
                onClick={() => setAddUserModalOpen(false)}
                className="theme-text-dim hover:theme-text-main text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div>
                <label className="theme-text-muted block mb-1">Username:</label>
                <input
                  type="text"
                  required
                  value={userUsername}
                  onChange={(e) => setUserUsername(e.target.value)}
                  placeholder="e.g., noc-operator"
                  className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="theme-text-muted block mb-1">Password:</label>
                <input
                  type="password"
                  required
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Enter secure password..."
                  className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none"
                />
                <span className="text-[10px] theme-text-dim mt-1 block">
                  Password will be hashed with PBKDF2-SHA512 AND encrypted with AES-256-GCM under the master key.
                </span>
              </div>

              <div>
                <label className="theme-text-muted block mb-1">Role / Permissions:</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as 'admin' | 'operator' | 'viewer')}
                  className="w-full theme-input border rounded px-3 py-2 font-mono focus:outline-none cursor-pointer"
                >
                  <option value="operator">Operator (Monitor + Outlet Control)</option>
                  <option value="admin">Administrator (Full Access + Vault + Key Rotation)</option>
                  <option value="viewer">Viewer (Read-Only Telemetry)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium theme-text-muted hover:theme-text-main rounded border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isSavingUser ? 'Encrypting...' : 'Save User to SQLite'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
