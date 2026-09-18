// lib/theme.ts

export interface ThemeConfig {
  // ── Core brand colors ─────────────────────────────────────────
  primaryColor: string;      // Buttons, active pills, CTA highlights
  secondaryColor: string;    // Gradient end / secondary accents

  // ── UI Element colors ──────────────────────────────────────────
  accentColor: string;       // Badges, count chips, tags
  cardBorderColor: string;   // Card left-border accent, panel borders

  // ── Navigation ─────────────────────────────────────────────────
  sidebarBg: string;         // Desktop sidebar background
  sidebarText: string;       // Sidebar inactive text color
  headerBg: string;          // Top header & mobile bottom nav background
  mobileNavBg: string;       // Mobile bottom nav (can differ from header)

  // ── Status colors ──────────────────────────────────────────────
  successColor: string;      // Open status, positive states
  dangerColor: string;       // Closed status, destructive actions
  warningColor: string;      // Expiring, caution states

  // ── Page ───────────────────────────────────────────────────────
  pageBg: string;            // Main page/content area background
  textPrimary: string;       // Primary body text
  textMuted: string;         // Secondary / muted text
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  primaryColor: '#f97316',
  secondaryColor: '#ea580c',
  accentColor: '#fb923c',
  cardBorderColor: '#fed7aa',
  sidebarBg: '#0f172a',
  sidebarText: '#94a3b8',
  headerBg: '#ffffff',
  mobileNavBg: '#ffffff',
  successColor: '#059669',
  dangerColor: '#e11d48',
  warningColor: '#d97706',
  pageBg: '#f8fafc',
  textPrimary: '#0f172a',
  textMuted: '#64748b',
};

// ── Quick palette presets ──────────────────────────────────────────
export interface ThemePalette {
  id: string;
  name: string;
  description: string;
  preview: string;
  config: ThemeConfig;
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'ember',
    name: 'Sunset Ember',
    description: 'Warm & vibrant — bistros, cafes, burger joints',
    preview: '#f97316',
    config: {
      primaryColor: '#f97316',
      secondaryColor: '#ea580c',
      accentColor: '#fb923c',
      cardBorderColor: '#fed7aa',
      sidebarBg: '#0f172a',
      sidebarText: '#94a3b8',
      headerBg: '#ffffff',
      mobileNavBg: '#ffffff',
      successColor: '#059669',
      dangerColor: '#e11d48',
      warningColor: '#d97706',
      pageBg: '#f8fafc',
      textPrimary: '#0f172a',
      textMuted: '#64748b',
    },
  },
  {
    id: 'emerald',
    name: 'Royal Emerald',
    description: 'Fresh & prestigious — fine dining, organic, garden',
    preview: '#059669',
    config: {
      primaryColor: '#059669',
      secondaryColor: '#047857',
      accentColor: '#34d399',
      cardBorderColor: '#a7f3d0',
      sidebarBg: '#064e3b',
      sidebarText: '#6ee7b7',
      headerBg: '#ffffff',
      mobileNavBg: '#ffffff',
      successColor: '#10b981',
      dangerColor: '#f43f5e',
      warningColor: '#f59e0b',
      pageBg: '#f0fdf4',
      textPrimary: '#0f172a',
      textMuted: '#64748b',
    },
  },
  {
    id: 'velvet',
    name: 'Crimson Velvet',
    description: 'Bold & passionate — steakhouses, Italian, cocktail bars',
    preview: '#e11d48',
    config: {
      primaryColor: '#e11d48',
      secondaryColor: '#be123c',
      accentColor: '#fb7185',
      cardBorderColor: '#fecdd3',
      sidebarBg: '#1f0a14',
      sidebarText: '#fda4af',
      headerBg: '#ffffff',
      mobileNavBg: '#ffffff',
      successColor: '#16a34a',
      dangerColor: '#dc2626',
      warningColor: '#f59e0b',
      pageBg: '#fff1f2',
      textPrimary: '#0f172a',
      textMuted: '#64748b',
    },
  },
  {
    id: 'indigo',
    name: 'Midnight Indigo',
    description: 'Sleek & modern — sushi, fusion, rooftop lounges',
    preview: '#6366f1',
    config: {
      primaryColor: '#6366f1',
      secondaryColor: '#4f46e5',
      accentColor: '#818cf8',
      cardBorderColor: '#c7d2fe',
      sidebarBg: '#1e1b4b',
      sidebarText: '#a5b4fc',
      headerBg: '#ffffff',
      mobileNavBg: '#ffffff',
      successColor: '#059669',
      dangerColor: '#e11d48',
      warningColor: '#d97706',
      pageBg: '#eef2ff',
      textPrimary: '#0f172a',
      textMuted: '#64748b',
    },
  },
  {
    id: 'saffron',
    name: 'Golden Saffron',
    description: 'Royal & heritage — Indian, Middle Eastern, artisan',
    preview: '#d97706',
    config: {
      primaryColor: '#d97706',
      secondaryColor: '#b45309',
      accentColor: '#fbbf24',
      cardBorderColor: '#fde68a',
      sidebarBg: '#1c1208',
      sidebarText: '#fcd34d',
      headerBg: '#fffbeb',
      mobileNavBg: '#fffbeb',
      successColor: '#16a34a',
      dangerColor: '#dc2626',
      warningColor: '#f59e0b',
      pageBg: '#fefce8',
      textPrimary: '#1c1917',
      textMuted: '#78716c',
    },
  },
  {
    id: 'slate',
    name: 'Dark Slate',
    description: 'Minimal & professional — modern bistros, cloud kitchens',
    preview: '#475569',
    config: {
      primaryColor: '#475569',
      secondaryColor: '#334155',
      accentColor: '#94a3b8',
      cardBorderColor: '#cbd5e1',
      sidebarBg: '#020617',
      sidebarText: '#64748b',
      headerBg: '#ffffff',
      mobileNavBg: '#ffffff',
      successColor: '#16a34a',
      dangerColor: '#dc2626',
      warningColor: '#d97706',
      pageBg: '#f8fafc',
      textPrimary: '#0f172a',
      textMuted: '#64748b',
    },
  },
];

// ── Parse from DB (supports legacy hex OR full JSON) ───────────────
export function parseThemeConfig(raw: string | null | undefined): ThemeConfig {
  if (!raw) return { ...DEFAULT_THEME_CONFIG };
  const trimmed = raw.trim();
  if (trimmed.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return { ...DEFAULT_THEME_CONFIG, primaryColor: trimmed.startsWith('#') ? trimmed : `#${trimmed}` };
  }
  try {
    const parsed = JSON.parse(trimmed) as Partial<ThemeConfig>;
    return { ...DEFAULT_THEME_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_THEME_CONFIG };
  }
}

export function serializeThemeConfig(config: ThemeConfig): string {
  return JSON.stringify(config);
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '').trim();
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

export function applyThemeToDOM(config: ThemeConfig) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const rgb = hexToRgb(config.primaryColor);

  // Core brand
  root.style.setProperty('--theme-primary', config.primaryColor);
  root.style.setProperty('--theme-secondary', config.secondaryColor);

  // Derived from primary
  root.style.setProperty('--theme-rgb', rgb);
  root.style.setProperty('--theme-light', `rgba(${rgb}, 0.12)`);
  root.style.setProperty('--theme-border', `rgba(${rgb}, 0.25)`);
  root.style.setProperty('--theme-glow', `rgba(${rgb}, 0.35)`);

  // UI elements
  root.style.setProperty('--theme-accent', config.accentColor);
  root.style.setProperty('--theme-card-border', config.cardBorderColor);

  // Navigation
  root.style.setProperty('--theme-sidebar-bg', config.sidebarBg);
  root.style.setProperty('--theme-sidebar-text', config.sidebarText);
  root.style.setProperty('--theme-header-bg', config.headerBg);
  root.style.setProperty('--theme-mobile-nav-bg', config.mobileNavBg);

  // Status
  root.style.setProperty('--theme-success', config.successColor);
  root.style.setProperty('--theme-danger', config.dangerColor);
  root.style.setProperty('--theme-warning', config.warningColor);

  // Page
  root.style.setProperty('--theme-page-bg', config.pageBg);
  root.style.setProperty('--theme-text-primary', config.textPrimary);
  root.style.setProperty('--theme-text-muted', config.textMuted);
}

// Legacy compat
export function applyThemeColorToDOM(hexColor: string = '#f97316') {
  applyThemeToDOM({ ...DEFAULT_THEME_CONFIG, primaryColor: hexColor });
}
