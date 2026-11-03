import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  Volume2,
  VolumeX,
  RefreshCw,
  Sun,
  Moon,
  Palette,
  Check,
  Sparkles
} from 'lucide-react';
import { useTheme, ColorTheme, ThemeMode } from '../context/ThemeContext.tsx';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertCount: number;
  criticalAlertCount: number;
  soundEnabled: boolean;
  toggleSound: () => void;
  isPolling: boolean;
  triggerManualRefresh: () => void;
  openAlertsDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  alertCount,
  criticalAlertCount,
  soundEnabled,
  toggleSound,
  isPolling,
  triggerManualRefresh,
  openAlertsDrawer,
}) => {
  const { mode, toggleMode, setMode, colorTheme, setColorTheme, theme, availableColors } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Close palette dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setPaletteOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'outlets', label: 'Outlets' },
    { id: 'telemetry', label: 'Telemetry' },
    { id: 'yaml', label: 'YAML Config' },
    { id: 'vault', label: 'Vault' },
    { id: 'docker', label: 'Docker & Tools' },
  ];

  return (
    <header className="theme-header border-b sticky top-0 z-40 backdrop-blur transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className={`text-lg font-bold tracking-tight transition-colors whitespace-nowrap shrink-0 font-mono flex items-center gap-2 ${theme.brandTextClass}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${theme.brandDotClass}`} />
            LYNCEUS
          </a>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium theme-text-muted">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 text-sm cursor-pointer ${
                  isActive
                    ? `${theme.activeTabBorder} font-semibold`
                    : 'border-transparent hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Controls Area */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick 4-Color Swatch Selector (Visible on Desktop) */}
          <div className="hidden lg:flex items-center gap-1 p-1 rounded-md border theme-border theme-card-subtle">
            {availableColors.map((c) => {
              const isSelected = colorTheme === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setColorTheme(c.id)}
                  title={`${c.name} Theme`}
                  className={`w-4 h-4 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                    isSelected ? 'scale-125 ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-300' : 'opacity-80 hover:opacity-100 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  aria-label={`${c.name} Theme`}
                >
                  {isSelected && <span className="w-1 h-1 rounded-full bg-white block" />}
                </button>
              );
            })}
          </div>

          {/* Color & Theme Settings Popover Dropdown */}
          <div className="relative" ref={paletteRef}>
            <button
              onClick={() => setPaletteOpen(!paletteOpen)}
              title="Theme Settings: Color Themes & Dark/Light Mode"
              className="px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5 border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer text-xs font-medium"
              aria-label="Theme Settings"
            >
              <Palette className="w-3.5 h-3.5" style={{ color: theme.previewHex }} />
              <span className="hidden sm:inline capitalize">{colorTheme}</span>
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/20 shrink-0"
                style={{ backgroundColor: theme.previewHex }}
              />
            </button>

            {paletteOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-lg shadow-xl theme-card border p-3 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between border-b theme-border pb-2">
                  <div className="flex items-center gap-1.5 font-semibold theme-text-main">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: theme.previewHex }} />
                    <span>Appearance & Themes</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider theme-text-dim">
                    4 Colors
                  </span>
                </div>

                {/* Mode Switcher Segmented Control */}
                <div>
                  <label className="text-[11px] font-medium theme-text-muted mb-1.5 block">
                    Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-md theme-card-subtle border theme-border">
                    <button
                      onClick={() => setMode('dark')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-medium transition-all cursor-pointer ${
                        mode === 'dark'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'theme-text-muted hover:theme-text-main'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Dark</span>
                    </button>
                    <button
                      onClick={() => setMode('light')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-medium transition-all cursor-pointer ${
                        mode === 'light'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'theme-text-muted hover:theme-text-main'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Light</span>
                    </button>
                  </div>
                </div>

                {/* 4 Color Themes Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium theme-text-muted">
                      Accent Color
                    </label>
                    <span className="text-[10px] font-mono theme-text-dim">
                      Active: {colorTheme}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {availableColors.map((c) => {
                      const isSelected = colorTheme === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setColorTheme(c.id)}
                          className={`flex items-center gap-2 p-2 rounded-md border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-2 theme-card font-semibold theme-text-main shadow-xs'
                              : 'theme-border hover:theme-card-subtle theme-text-muted'
                          }`}
                          style={{
                            borderColor: isSelected ? c.hex : undefined,
                          }}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <div className="overflow-hidden">
                            <span className="block truncate capitalize text-[11px]">
                              {c.name.split(' ')[0]}
                            </span>
                            <span className="text-[9px] font-mono theme-text-dim uppercase">
                              {c.id}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: c.hex }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Theme Preview Card */}
                <div className="pt-2 border-t theme-border flex items-center justify-between text-[10px] font-mono theme-text-dim">
                  <span>Theme: {colorTheme} / {mode}</span>
                  <span
                    className="px-1.5 py-0.5 rounded font-sans font-semibold text-[10px]"
                    style={{
                      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      color: theme.previewHex,
                    }}
                  >
                    Active
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Dedicated Quick Dark / Light Mode Toggle Button */}
          <button
            onClick={toggleMode}
            title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 rounded transition-colors border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            aria-label="Toggle Dark/Light Mode"
          >
            {mode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 hover:text-slate-900" />
            )}
          </button>

          {/* Audio toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
            className="p-1.5 rounded transition-colors border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            aria-label="Toggle Alert Sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" style={{ color: theme.previewHex }} />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </button>

          {/* Manual poll refresh */}
          <button
            onClick={triggerManualRefresh}
            title="Poll now"
            className="p-1.5 rounded transition-colors border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            aria-label="Refresh Telemetry"
          >
            <RefreshCw
              className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`}
              style={{ color: isPolling ? theme.previewHex : undefined }}
            />
          </button>

          {/* Alerts Counter Button */}
          <button
            onClick={openAlertsDrawer}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              criticalAlertCount > 0
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : alertCount > 0
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Alerts ({alertCount})</span>
          </button>
        </div>
      </div>

      {/* Mobile nav strip */}
      <div className="md:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t theme-border theme-card text-xs">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`px-2.5 py-1 rounded whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === item.id
                ? `${theme.badgeBg} ${theme.badgeText} font-medium`
                : 'theme-text-muted hover:theme-text-main'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
