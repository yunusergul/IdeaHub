import type { ThemeMode } from '../types';

interface PaletteColors {
  50: string; 100: string; 200: string; 300: string;
  400: string; 500: string; 600: string; 700: string;
  800: string; 900: string;
}

interface Palette {
  id: string;
  label: string;
  colors: PaletteColors;
}

export const PALETTES: Record<string, Palette> = {
  indigo: {
    id: 'indigo',
    label: 'Indigo',
    colors: {
      50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
      400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
      800: '#3730a3', 900: '#312e81',
    },
  },
  blue: {
    id: 'blue',
    label: 'Mavi',
    colors: {
      50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
      400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
      800: '#1e40af', 900: '#1e3a8a',
    },
  },
  violet: {
    id: 'violet',
    label: 'Mor',
    colors: {
      50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
      400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
      800: '#5b21b6', 900: '#4c1d95',
    },
  },
  rose: {
    id: 'rose',
    label: 'Pembe',
    colors: {
      50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
      400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
      800: '#9f1239', 900: '#881337',
    },
  },
  emerald: {
    id: 'emerald',
    label: 'Yesil',
    colors: {
      50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
      400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
      800: '#065f46', 900: '#064e3b',
    },
  },
  amber: {
    id: 'amber',
    label: 'Turuncu',
    colors: {
      50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
      400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
      800: '#92400e', 900: '#78350f',
    },
  },
  teal: {
    id: 'teal',
    label: 'Turkuaz',
    colors: {
      50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
      400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
      800: '#115e59', 900: '#134e4a',
    },
  },
  cyan: {
    id: 'cyan',
    label: 'Gok Mavi',
    colors: {
      50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
      400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
      800: '#155e75', 900: '#164e63',
    },
  },
};

export const PALETTE_IDS = Object.keys(PALETTES);
export const DEFAULT_PALETTE = 'indigo';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  } : { r: 0, g: 0, b: 0 };
}

function mixWithDark(hex: string, ratio: number, base = { r: 15, g: 17, b: 35 }): string {
  const c = hexToRgb(hex);
  const r = Math.round(base.r + (c.r - base.r) * ratio);
  const g = Math.round(base.g + (c.g - base.g) * ratio);
  const b = Math.round(base.b + (c.b - base.b) * ratio);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getDarkColors(colors: PaletteColors): PaletteColors {
  return {
    50: mixWithDark(colors[500], 0.15),
    100: mixWithDark(colors[500], 0.22),
    200: mixWithDark(colors[500], 0.30),
    300: colors[400],
    400: colors[400],
    500: colors[500],
    600: colors[400],
    700: colors[300],
    800: colors[200],
    900: colors[100],
  };
}

export function applyPalette(paletteId: string, theme: ThemeMode | string): void {
  const palette = PALETTES[paletteId] || PALETTES[DEFAULT_PALETTE]!;
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  const isDark = resolved === 'dark' || (resolved == null && document.documentElement.getAttribute('data-theme') === 'dark');
  const colors = isDark ? getDarkColors(palette.colors) : palette.colors;
  const root = document.documentElement;
  for (const [shade, color] of Object.entries(colors)) {
    root.style.setProperty(`--primary-${shade}`, color);
  }
  root.style.setProperty('--shadow-focus', `0 0 0 3px ${palette.colors[500]}1f`);
}
