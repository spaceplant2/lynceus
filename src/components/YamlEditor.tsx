import React, { useState, useEffect, useRef } from 'react';
import {
  FileCode,
  Save,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  BookOpen,
  Settings,
  Server,
  Sliders
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';

export type ConfigFileKey = 'settings' | 'profiles' | 'devices';

interface ConfigFileItem {
  key: ConfigFileKey;
  filename: string;
  title: string;
  description: string;
  path: string;
  rawYaml: string;
}

interface YamlEditorProps {
  onSaveSuccess?: () => void;
}

export const YamlEditor: React.FC<YamlEditorProps> = ({ onSaveSuccess }) => {
  const { theme } = useTheme();
  const [activeFileKey, setActiveFileKey] = useState<ConfigFileKey>('settings');
  const [files, setFiles] = useState<Record<ConfigFileKey, ConfigFileItem>>({
    settings: {
      key: 'settings',
      filename: 'settings.yaml',
      title: 'General Settings',
      description: 'Alert thresholds, polling frequencies, and lab simulation fallback options',
      path: '/config/settings.yaml',
      rawYaml: '',
    },
    profiles: {
      key: 'profiles',
      filename: 'profiles.yaml',
      title: 'MIB Profiles',
      description: 'Reusable SNMP OID mappings for APC PowerNet, RFC 1628, Eaton, etc.',
      path: '/config/profiles.yaml',
      rawYaml: '',
    },
    devices: {
      key: 'devices',
      filename: 'devices.yaml',
      title: 'Devices & Outlets',
      description: 'Hardware target IPs, ports, communities, and remote outlet mappings',
      path: '/config/devices.yaml',
      rawYaml: '',
    },
  });

  // Local editing buffers per file
  const [buffers, setBuffers] = useState<Record<ConfigFileKey, string>>({
    settings: '',
    profiles: '',
    devices: '',
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showCheatsheet, setShowCheatsheet] = useState<boolean>(false);

  const fetchConfigs = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/config');
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.files)) {
          const newFilesMap = { ...files };
          const newBuffersMap = { ...buffers };

          for (const f of data.files as ConfigFileItem[]) {
            if (newFilesMap[f.key]) {
              newFilesMap[f.key] = f;
              newBuffersMap[f.key] = f.rawYaml;
            }
          }
          setFiles(newFilesMap);
          setBuffers(newBuffersMap);
        } else {
          setStatusMessage({ type: 'error', text: data.error || 'Failed to load configuration files' });
        }
      } else {
        setStatusMessage({ type: 'error', text: 'Configuration service initializing, please retry momentarily.' });
      }
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const currentFile = files[activeFileKey];
  const currentBuffer = buffers[activeFileKey];
  const isCurrentDirty = currentBuffer !== currentFile?.rawYaml;

  const handleTextChange = (val: string) => {
    setBuffers((prev) => ({
      ...prev,
      [activeFileKey]: val,
    }));
  };

  const handleSaveActive = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileKey: activeFileKey,
          yamlContent: currentBuffer,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: data.message || `${currentFile.filename} saved and SNMP poller hot-reloaded successfully.`,
        });
        // Update stored clean file
        setFiles((prev) => ({
          ...prev,
          [activeFileKey]: {
            ...prev[activeFileKey],
            rawYaml: currentBuffer,
          },
        }));
        if (onSaveSuccess) onSaveSuccess();
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'YAML Validation Error: please check indentation and syntax.',
        });
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: (err as Error).message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = () => {
    if (window.confirm(`Discard unsaved changes to ${currentFile.filename}?`)) {
      setBuffers((prev) => ({
        ...prev,
        [activeFileKey]: currentFile.rawYaml,
      }));
      setStatusMessage(null);
    }
  };

  const handleDownload = (key: ConfigFileKey) => {
    window.location.href = `/api/config/download/${key}`;
  };

  // Synchronized scrolling for gutter line numbers
  const gutterRef = useRef<HTMLDivElement>(null);
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const tabsConfig: Array<{
    key: ConfigFileKey;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'settings',
      label: 'General Settings',
      subtitle: 'settings.yaml',
      icon: <Settings className="w-3.5 h-3.5" />,
    },
    {
      key: 'profiles',
      label: 'MIB Profiles',
      subtitle: 'profiles.yaml',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      key: 'devices',
      label: 'Devices & Outlets',
      subtitle: 'devices.yaml',
      icon: <Server className="w-3.5 h-3.5" />,
    },
  ];

  const lineCount = currentBuffer ? currentBuffer.split('\n').length : 1;

  return (
    <div className="space-y-6">
      {/* 1. Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
        <div>
          <h2 className="text-base font-semibold theme-text-main tracking-tight">YAML Configuration Manager</h2>
          <div className="text-xs theme-text-muted mt-0.5 flex items-center gap-2 font-mono">
            <span>Modular Configuration Structure</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>Hot-Reload on Save</span>
            <span aria-hidden="true" className="theme-text-dim">·</span>
            <span>Independent File Buffers</span>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCheatsheet(!showCheatsheet)}
            className="px-3 py-1.5 text-xs rounded border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 theme-text-muted hover:theme-text-main transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" style={{ color: theme.previewHex }} />
            <span>OID Reference</span>
          </button>

          <button
            onClick={() => handleDownload(activeFileKey)}
            className="px-3 py-1.5 text-xs rounded border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 theme-text-muted hover:theme-text-main transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {currentFile.filename}</span>
          </button>

          <button
            disabled={isSaving || !isCurrentDirty}
            onClick={handleSaveActive}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
              isCurrentDirty
                ? theme.primaryButtonClass
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : isCurrentDirty ? `Save ${currentFile.filename}` : 'Saved'}</span>
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded text-xs flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="theme-text-muted hover:theme-text-main text-xs underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* OID Cheatsheet Drawer */}
      {showCheatsheet && (
        <div className="p-4 theme-card-subtle rounded border theme-border text-xs space-y-3">
          <div className="flex items-center justify-between font-semibold theme-text-main border-b theme-border pb-2">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" style={{ color: theme.previewHex }} />
              Standard UPS & PDU SNMP OID Reference Table
            </span>
            <button
              onClick={() => setShowCheatsheet(false)}
              className="theme-text-dim hover:theme-text-main text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
            <div className="theme-card p-3 rounded border theme-border">
              <span className="font-bold block mb-1" style={{ color: theme.previewHex }}>APC PowerNet MIB (1.3.6.1.4.1.318)</span>
              <ul className="space-y-1 theme-text-muted">
                <li><code className="theme-text-main">.1.1.1.2.2.1.0</code> - Battery Capacity (%)</li>
                <li><code className="theme-text-main">.1.1.1.2.2.3.0</code> - Battery Runtime (Timeticks/6000 = min)</li>
                <li><code className="theme-text-main">.1.1.1.3.2.1.0</code> - Input Line Voltage (VAC)</li>
                <li><code className="theme-text-main">.1.1.1.4.2.3.0</code> - Output Load (%)</li>
                <li><code className="theme-text-main">.1.1.4.4.2.1.3.X</code> - Outlet X Control (1=On, 2=Off, 3=Reboot)</li>
                <li><code className="theme-text-main">.1.1.12.2.3.1.1.2.1</code> - PDU Phase 1 Load (0.1 Amps)</li>
              </ul>
            </div>
            <div className="theme-card p-3 rounded border theme-border">
              <span className="font-bold block mb-1" style={{ color: theme.previewHex }}>Standard RFC 1628 UPS-MIB (1.3.6.1.2.1.33)</span>
              <ul className="space-y-1 theme-text-muted">
                <li><code className="theme-text-main">.1.2.4.0</code> - Estimated Charge Remaining (%)</li>
                <li><code className="theme-text-main">.1.2.3.0</code> - Estimated Minutes Remaining (min)</li>
                <li><code className="theme-text-main">.1.3.3.1.3.1</code> - Input Voltage (VAC)</li>
                <li><code className="theme-text-main">.1.4.4.1.5.1</code> - Output Percent Load (%)</li>
                <li><code className="theme-text-main">.1.4.4.1.4.1</code> - Output Power (Watts)</li>
                <li><code className="theme-text-main">.1.4.1.0</code> - Output Source (3=Normal, 5=Battery)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 2. File Tabs Bar Along the Top */}
      <div className="flex items-center gap-2 border-b theme-border">
        {tabsConfig.map((tab) => {
          const isActive = activeFileKey === tab.key;
          const isFileDirty = buffers[tab.key] !== files[tab.key]?.rawYaml;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveFileKey(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                isActive
                  ? `${theme.activeTabBorder} ${theme.badgeBg} font-semibold`
                  : 'border-transparent theme-text-muted hover:theme-text-main hover:bg-slate-100 dark:hover:bg-slate-800/40'
              }`}
            >
              <span style={{ color: isActive ? theme.previewHex : undefined }}>{tab.icon}</span>
              <span className="font-semibold">{tab.label}</span>
              <span className="font-mono text-[11px] theme-text-dim font-normal">
                ({tab.subtitle})
              </span>
              {isFileDirty && (
                <span
                  title="Unsaved changes in this file"
                  className="w-2 h-2 rounded-full bg-amber-500 ml-1 inline-block animate-pulse"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Editor Box Container */}
      <div className="border theme-border rounded theme-card overflow-hidden font-mono text-xs shadow-xs">
        {/* Editor Sub-Header */}
        <div className="px-4 py-2.5 border-b theme-border theme-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 theme-text-muted">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4" style={{ color: theme.previewHex }} />
            <span className="theme-text-main font-bold">{currentFile.filename}</span>
            <span className="theme-text-muted text-xs font-sans">
              — {currentFile.description}
            </span>
            {isCurrentDirty && (
              <span className="text-[10px] text-amber-500 font-bold ml-1 font-mono">
                • Unsaved edits
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[11px] theme-text-dim shrink-0">
            <span>{currentFile.path}</span>
            <span>{lineCount} lines</span>
          </div>
        </div>

        {/* Textarea Code Area with Synchronized Scrolling Gutter */}
        <div className="relative flex h-[500px] overflow-hidden theme-input">
          {/* Synchronized Line Numbers Gutter */}
          <div
            ref={gutterRef}
            aria-hidden="true"
            className="select-none py-3 px-2 theme-card-subtle theme-text-dim border-r theme-border text-right font-mono text-xs w-12 shrink-0 h-full overflow-hidden"
          >
            {Array.from({ length: Math.max(1, lineCount) }).map((_, i) => (
              <div key={i} className="leading-5 h-5">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Actual Textarea */}
          <textarea
            value={currentBuffer}
            onChange={(e) => handleTextChange(e.target.value)}
            onScroll={handleScroll}
            disabled={isLoading}
            spellCheck={false}
            className="w-full h-full p-3 bg-transparent theme-text-main font-mono text-xs leading-5 resize-none focus:outline-none focus:ring-0 whitespace-pre overflow-auto"
          />
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 border-t theme-border theme-card-subtle flex items-center justify-between theme-text-dim text-[11px]">
          <span>
            Saving automatically validates syntax and hot-reloads without restarting Lynceus.
          </span>
          <div className="flex items-center gap-3">
            {isCurrentDirty && (
              <button
                onClick={handleRevert}
                className="theme-text-muted hover:theme-text-main underline cursor-pointer"
              >
                Revert to Saved
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
