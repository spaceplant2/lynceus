import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';
export type ColorTheme = 'blue' | 'green' | 'purple' | 'red';

export interface ThemeColors {
  id: ColorTheme;
  name: string;
  previewHex: string;
  // Chart stroke & fill hex colors
  chartPrimary: string;
  chartSecondary: string;
  chartTertiary: string;
  // Tailwind color names/classes for UI components
  brandDotClass: string;
  brandTextClass: string;
  activeTabBorder: string;
  activeTabText: string;
  primaryButtonClass: string;
  primaryButtonOutlineClass: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  accentText: string;
  accentBg: string;
  ringClass: string;
  borderActive: string;
}

const THEME_DEFINITIONS: Record<ColorTheme, { light: ThemeColors; dark: ThemeColors }> = {
  blue: {
    dark: {
      id: 'blue',
      name: 'Electric Blue',
      previewHex: '#38bdf8',
      chartPrimary: '#38bdf8',
      chartSecondary: '#818cf8',
      chartTertiary: '#34d399',
      brandDotClass: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]',
      brandTextClass: 'text-white hover:text-sky-400',
      activeTabBorder: 'border-sky-400 text-white',
      activeTabText: 'text-sky-300',
      primaryButtonClass: 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold shadow-[0_0_12px_rgba(56,189,248,0.25)]',
      primaryButtonOutlineClass: 'border-sky-500/40 text-sky-400 hover:bg-sky-500/10',
      badgeBg: 'bg-sky-950/60',
      badgeBorder: 'border-sky-800/80',
      badgeText: 'text-sky-300',
      accentText: 'text-sky-400',
      accentBg: 'bg-sky-500/10',
      ringClass: 'focus:border-sky-400 focus:ring-sky-400/20',
      borderActive: 'border-sky-500',
    },
    light: {
      id: 'blue',
      name: 'Electric Blue',
      previewHex: '#0284c7',
      chartPrimary: '#0284c7',
      chartSecondary: '#6366f1',
      chartTertiary: '#059669',
      brandDotClass: 'bg-sky-600 shadow-[0_0_8px_rgba(2,132,199,0.5)]',
      brandTextClass: 'text-slate-900 hover:text-sky-600',
      activeTabBorder: 'border-sky-600 text-slate-950',
      activeTabText: 'text-sky-700',
      primaryButtonClass: 'bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]',
      primaryButtonOutlineClass: 'border-sky-300 text-sky-700 hover:bg-sky-50',
      badgeBg: 'bg-sky-50',
      badgeBorder: 'border-sky-200',
      badgeText: 'text-sky-800',
      accentText: 'text-sky-600',
      accentBg: 'bg-sky-50',
      ringClass: 'focus:border-sky-600 focus:ring-sky-600/20',
      borderActive: 'border-sky-600',
    },
  },
  green: {
    dark: {
      id: 'green',
      name: 'Emerald Green',
      previewHex: '#34d399',
      chartPrimary: '#34d399',
      chartSecondary: '#38bdf8',
      chartTertiary: '#fbbf24',
      brandDotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
      brandTextClass: 'text-white hover:text-emerald-400',
      activeTabBorder: 'border-emerald-400 text-white',
      activeTabText: 'text-emerald-300',
      primaryButtonClass: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-[0_0_12px_rgba(52,211,153,0.25)]',
      primaryButtonOutlineClass: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10',
      badgeBg: 'bg-emerald-950/60',
      badgeBorder: 'border-emerald-800/80',
      badgeText: 'text-emerald-300',
      accentText: 'text-emerald-400',
      accentBg: 'bg-emerald-500/10',
      ringClass: 'focus:border-emerald-400 focus:ring-emerald-400/20',
      borderActive: 'border-emerald-500',
    },
    light: {
      id: 'green',
      name: 'Emerald Green',
      previewHex: '#059669',
      chartPrimary: '#059669',
      chartSecondary: '#0284c7',
      chartTertiary: '#d97706',
      brandDotClass: 'bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.5)]',
      brandTextClass: 'text-slate-900 hover:text-emerald-600',
      activeTabBorder: 'border-emerald-600 text-slate-950',
      activeTabText: 'text-emerald-700',
      primaryButtonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]',
      primaryButtonOutlineClass: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
      badgeText: 'text-emerald-800',
      accentText: 'text-emerald-600',
      accentBg: 'bg-emerald-50',
      ringClass: 'focus:border-emerald-600 focus:ring-emerald-600/20',
      borderActive: 'border-emerald-600',
    },
  },
  purple: {
    dark: {
      id: 'purple',
      name: 'Neon Purple',
      previewHex: '#c084fc',
      chartPrimary: '#c084fc',
      chartSecondary: '#38bdf8',
      chartTertiary: '#f472b6',
      brandDotClass: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.7)]',
      brandTextClass: 'text-white hover:text-purple-400',
      activeTabBorder: 'border-purple-400 text-white',
      activeTabText: 'text-purple-300',
      primaryButtonClass: 'bg-purple-500 hover:bg-purple-400 text-slate-950 font-semibold shadow-[0_0_12px_rgba(192,132,252,0.25)]',
      primaryButtonOutlineClass: 'border-purple-500/40 text-purple-400 hover:bg-purple-500/10',
      badgeBg: 'bg-purple-950/60',
      badgeBorder: 'border-purple-800/80',
      badgeText: 'text-purple-300',
      accentText: 'text-purple-400',
      accentBg: 'bg-purple-500/10',
      ringClass: 'focus:border-purple-400 focus:ring-purple-400/20',
      borderActive: 'border-purple-500',
    },
    light: {
      id: 'purple',
      name: 'Neon Purple',
      previewHex: '#7c3aed',
      chartPrimary: '#7c3aed',
      chartSecondary: '#0284c7',
      chartTertiary: '#db2777',
      brandDotClass: 'bg-purple-600 shadow-[0_0_8px_rgba(124,58,237,0.5)]',
      brandTextClass: 'text-slate-900 hover:text-purple-600',
      activeTabBorder: 'border-purple-600 text-slate-950',
      activeTabText: 'text-purple-700',
      primaryButtonClass: 'bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]',
      primaryButtonOutlineClass: 'border-purple-300 text-purple-700 hover:bg-purple-50',
      badgeBg: 'bg-purple-50',
      badgeBorder: 'border-purple-200',
      badgeText: 'text-purple-800',
      accentText: 'text-purple-600',
      accentBg: 'bg-purple-50',
      ringClass: 'focus:border-purple-600 focus:ring-purple-600/20',
      borderActive: 'border-purple-600',
    },
  },
  red: {
    dark: {
      id: 'red',
      name: 'Crimson Red',
      previewHex: '#f87171',
      chartPrimary: '#f87171',
      chartSecondary: '#fb923c',
      chartTertiary: '#38bdf8',
      brandDotClass: 'bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.7)]',
      brandTextClass: 'text-white hover:text-rose-400',
      activeTabBorder: 'border-rose-400 text-white',
      activeTabText: 'text-rose-300',
      primaryButtonClass: 'bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold shadow-[0_0_12px_rgba(248,113,113,0.25)]',
      primaryButtonOutlineClass: 'border-rose-500/40 text-rose-400 hover:bg-rose-500/10',
      badgeBg: 'bg-rose-950/60',
      badgeBorder: 'border-rose-800/80',
      badgeText: 'text-rose-300',
      accentText: 'text-rose-400',
      accentBg: 'bg-rose-500/10',
      ringClass: 'focus:border-rose-400 focus:ring-rose-400/20',
      borderActive: 'border-rose-500',
    },
    light: {
      id: 'red',
      name: 'Crimson Red',
      previewHex: '#dc2626',
      chartPrimary: '#dc2626',
      chartSecondary: '#ea580c',
      chartTertiary: '#0284c7',
      brandDotClass: 'bg-rose-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]',
      brandTextClass: 'text-slate-900 hover:text-rose-600',
      activeTabBorder: 'border-rose-600 text-slate-950',
      activeTabText: 'text-rose-700',
      primaryButtonClass: 'bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]',
      primaryButtonOutlineClass: 'border-rose-300 text-rose-700 hover:bg-rose-50',
      badgeBg: 'bg-rose-50',
      badgeBorder: 'border-rose-200',
      badgeText: 'text-rose-800',
      accentText: 'text-rose-600',
      accentBg: 'bg-rose-50',
      ringClass: 'focus:border-rose-600 focus:ring-rose-600/20',
      borderActive: 'border-rose-600',
    },
  },
};

interface ThemeContextValue {
  mode: ThemeMode;
  colorTheme: ColorTheme;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  setColorTheme: (color: ColorTheme) => void;
  theme: ThemeColors;
  availableColors: { id: ColorTheme; name: string; hex: string }[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('lynceus_theme_mode');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    try {
      const saved = localStorage.getItem('lynceus_color_theme');
      if (saved === 'blue' || saved === 'green' || saved === 'purple' || saved === 'red') {
        return saved;
      }
    } catch {}
    return 'blue';
  });

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem('lynceus_theme_mode', newMode);
    } catch {}
  };

  const toggleMode = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  const setColorTheme = (newColor: ColorTheme) => {
    setColorThemeState(newColor);
    try {
      localStorage.setItem('lynceus_color_theme', newColor);
    } catch {}
  };

  // Sync with HTML root document
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Set data attributes for themes
    root.setAttribute('data-mode', mode);
    root.setAttribute('data-theme', colorTheme);

    // Remove older theme classes and add active
    root.classList.remove('theme-blue', 'theme-green', 'theme-purple', 'theme-red');
    root.classList.add(`theme-${colorTheme}`);
  }, [mode, colorTheme]);

  const activeThemeConfig = THEME_DEFINITIONS[colorTheme][mode];

  const availableColors = [
    { id: 'blue' as ColorTheme, name: 'Electric Blue', hex: mode === 'dark' ? '#38bdf8' : '#0284c7' },
    { id: 'green' as ColorTheme, name: 'Emerald Green', hex: mode === 'dark' ? '#34d399' : '#059669' },
    { id: 'purple' as ColorTheme, name: 'Neon Purple', hex: mode === 'dark' ? '#c084fc' : '#7c3aed' },
    { id: 'red' as ColorTheme, name: 'Crimson Red', hex: mode === 'dark' ? '#f87171' : '#dc2626' },
  ];

  return (
    <ThemeContext.Provider
      value={{
        mode,
        colorTheme,
        toggleMode,
        setMode,
        setColorTheme,
        theme: activeThemeConfig,
        availableColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
