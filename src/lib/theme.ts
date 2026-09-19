// src/lib/theme.ts
// Centralized Theme & Color Customization Engine

import { supabase } from '@/lib/supabase';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  sidebar_color: string;
  navbar_color: string;
  text_color: string;
  muted_text_color: string;
  border_color: string;
  button_color: string;
  button_hover_color: string;
  success_color: string;
  warning_color: string;
  danger_color: string;
  info_color: string;
  link_color: string;
  badge_color: string;
}

export interface RestaurantThemeSettings extends ThemeColors {
  id?: string;
  restaurant_id: string;
  theme: ThemeMode;
  created_at?: string;
  updated_at?: string;
}

// ── Default Design Token Palette (Light - Default) ────────────────────
export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary_color: '#2563EB',
  secondary_color: '#F1F5F9',
  accent_color: '#06B6D4',
  background_color: '#F8FAFC',
  surface_color: '#FFFFFF',
  sidebar_color: '#FFFFFF',
  navbar_color: '#FFFFFF',
  text_color: '#0F172A',
  muted_text_color: '#64748B',
  border_color: '#E2E8F0',
  button_color: '#2563EB',
  button_hover_color: '#1D4ED8',
  success_color: '#16A34A',
  warning_color: '#D97706',
  danger_color: '#DC2626',
  info_color: '#0284C7',
  link_color: '#2563EB',
  badge_color: '#2563EB',
};

// ── Dark Design Token Palette (Production-Grade Dark UI) ─────────────
export const DARK_THEME_COLORS: ThemeColors = {
  primary_color: '#60A5FA',
  secondary_color: '#1E293B',
  accent_color: '#22D3EE',
  background_color: '#0B1220',
  surface_color: '#111827',
  sidebar_color: '#111827',
  navbar_color: '#111827',
  text_color: '#F8FAFC',
  muted_text_color: '#94A3B8',
  border_color: '#334155',
  button_color: '#60A5FA',
  button_hover_color: '#3B82F6',
  success_color: '#4ADE80',
  warning_color: '#FBBF24',
  danger_color: '#F87171',
  info_color: '#38BDF8',
  link_color: '#60A5FA',
  badge_color: '#60A5FA',
};

export const COLOR_KEYS: (keyof ThemeColors)[] = [
  'primary_color',
  'secondary_color',
  'accent_color',
  'background_color',
  'surface_color',
  'sidebar_color',
  'navbar_color',
  'text_color',
  'muted_text_color',
  'border_color',
  'button_color',
  'button_hover_color',
  'success_color',
  'warning_color',
  'danger_color',
  'info_color',
  'link_color',
  'badge_color',
];

export const COLOR_CONFIG: Record<
  keyof ThemeColors,
  { label: string; description: string; group: 'Brand' | 'Surfaces & Nav' | 'Typography & Borders' | 'Buttons' | 'Status' }
> = {
  primary_color: {
    label: 'Primary Color',
    description: 'Main brand highlights, active pills, indicators',
    group: 'Brand',
  },
  secondary_color: {
    label: 'Secondary Color',
    description: 'Secondary brand highlights & gradient depth',
    group: 'Brand',
  },
  accent_color: {
    label: 'Accent Color',
    description: 'Accents, counter badges & highlights',
    group: 'Brand',
  },
  background_color: {
    label: 'Background Color',
    description: 'Main application & page background',
    group: 'Surfaces & Nav',
  },
  surface_color: {
    label: 'Card / Surface Color',
    description: 'Cards, panels, popups & modals',
    group: 'Surfaces & Nav',
  },
  sidebar_color: {
    label: 'Sidebar Color',
    description: 'Desktop navigation sidebar surface',
    group: 'Surfaces & Nav',
  },
  navbar_color: {
    label: 'Navbar Color',
    description: 'Top header bar & mobile navigation',
    group: 'Surfaces & Nav',
  },
  text_color: {
    label: 'Text Color',
    description: 'Main body, titles & heading text',
    group: 'Typography & Borders',
  },
  muted_text_color: {
    label: 'Muted Text Color',
    description: 'Secondary captions, hints & muted text',
    group: 'Typography & Borders',
  },
  border_color: {
    label: 'Border Color',
    description: 'Card outlines, dividers & separators',
    group: 'Typography & Borders',
  },
  button_color: {
    label: 'Button Color',
    description: 'Main action & primary button background',
    group: 'Buttons',
  },
  button_hover_color: {
    label: 'Button Hover Color',
    description: 'Button state on hover/press interaction',
    group: 'Buttons',
  },
  success_color: {
    label: 'Success Color',
    description: 'Success alerts, completed orders & open status',
    group: 'Status',
  },
  warning_color: {
    label: 'Warning Color',
    description: 'Warnings, pending status & alert chips',
    group: 'Status',
  },
  danger_color: {
    label: 'Danger / Error Color',
    description: 'Destructive buttons, errors & urgent alerts',
    group: 'Status',
  },
  info_color: {
    label: 'Info Color',
    description: 'Informational tips, badges & links',
    group: 'Status',
  },
  link_color: {
    label: 'Link Color',
    description: 'Hyperlinks, interactive text & anchors',
    group: 'Typography & Borders',
  },
  badge_color: {
    label: 'Badge Color',
    description: 'Status chips, count badges & tags',
    group: 'Status',
  },
};

// ── Color Utilities & Contrast (WCAG 2.1) ──────────────────────────
export function normalizeHex(color: string | null | undefined, fallback: string): string {
  if (!color) return fallback;
  let c = color.trim();
  if (!c.startsWith('#')) c = `#${c}`;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) {
    if (c.length === 4) {
      c = `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
    }
    return c.toUpperCase();
  }
  return fallback;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return { r: 22, g: 163, b: 74 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const sRGB = [r / 255, g / 255, b / 255];
  const linear = sRGB.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastTextColor(bgHex: string): string {
  const lum = getRelativeLuminance(bgHex);
  return lum > 0.45 ? '#0F172A' : '#FFFFFF';
}

export function lightenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * (percent / 100),
    g + (255 - g) * (percent / 100),
    b + (255 - b) * (percent / 100)
  );
}

export function darkenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r * (1 - percent / 100),
    g * (1 - percent / 100),
    b * (1 - percent / 100)
  );
}

// ── Dark Mode Intelligent Contrast Derivation ────────────────────────
export function deriveEffectiveColors(
  configured: ThemeColors,
  effectiveMode: 'light' | 'dark'
): ThemeColors {
  if (effectiveMode === 'light') {
    return { ...configured };
  }

  // Exact production Dark Theme tokens
  return {
    ...configured,
    background_color: '#0B1220',
    surface_color: '#111827',
    sidebar_color: '#111827',
    navbar_color: '#111827',
    text_color: '#F8FAFC',
    muted_text_color: '#94A3B8',
    border_color: '#334155',
    primary_color: configured.primary_color === DEFAULT_THEME_COLORS.primary_color ? DARK_THEME_COLORS.primary_color : configured.primary_color,
    secondary_color: DARK_THEME_COLORS.secondary_color,
    accent_color: DARK_THEME_COLORS.accent_color,
    button_color: configured.button_color === DEFAULT_THEME_COLORS.button_color ? DARK_THEME_COLORS.button_color : configured.button_color,
    button_hover_color: DARK_THEME_COLORS.button_hover_color,
    success_color: DARK_THEME_COLORS.success_color,
    warning_color: DARK_THEME_COLORS.warning_color,
    danger_color: DARK_THEME_COLORS.danger_color,
    info_color: DARK_THEME_COLORS.info_color,
    link_color: DARK_THEME_COLORS.link_color,
    badge_color: DARK_THEME_COLORS.badge_color,
  };
}

// ── DOM Injection ───────────────────────────────────────────────────
export function applyThemeToDOM(
  colors: ThemeColors,
  effectiveMode: 'light' | 'dark'
) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const effective = deriveEffectiveColors(colors, effectiveMode);
  const primaryRgb = hexToRgb(effective.primary_color);
  const rgbString = `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`;
  const btnContrast = getContrastTextColor(effective.button_color);
  const badgeContrast = getContrastTextColor(effective.badge_color);

  // 1. Centralized CSS Variables / Design Tokens (18 variables)
  root.style.setProperty('--color-primary', effective.primary_color);
  root.style.setProperty('--color-primary-hover', effectiveMode === 'dark' ? '#3B82F6' : '#1D4ED8');
  root.style.setProperty('--color-primary-soft', effectiveMode === 'dark' ? '#172554' : '#EFF6FF');
  root.style.setProperty('--color-secondary', effective.secondary_color);
  root.style.setProperty('--color-accent', effective.accent_color);
  root.style.setProperty('--color-background', effective.background_color);
  root.style.setProperty('--color-surface', effective.surface_color);
  root.style.setProperty('--color-surface-secondary', effectiveMode === 'dark' ? '#1E293B' : '#F1F5F9');
  root.style.setProperty('--color-surface-elevated', effectiveMode === 'dark' ? '#1E293B' : '#FFFFFF');
  root.style.setProperty('--color-surface-hover', effectiveMode === 'dark' ? '#243244' : '#F8FAFC');
  root.style.setProperty('--color-surface-active', effectiveMode === 'dark' ? '#293548' : '#E2E8F0');
  root.style.setProperty('--color-sidebar', effective.sidebar_color);
  root.style.setProperty('--color-navbar', effective.navbar_color);
  root.style.setProperty('--color-text', effective.text_color);
  root.style.setProperty('--color-text-secondary', effectiveMode === 'dark' ? '#CBD5E1' : '#475569');
  root.style.setProperty('--color-muted-text', effective.muted_text_color);
  root.style.setProperty('--color-text-placeholder', effectiveMode === 'dark' ? '#64748B' : '#94A3B8');
  root.style.setProperty('--color-border', effective.border_color);
  root.style.setProperty('--color-border-light', effectiveMode === 'dark' ? '#1E293B' : '#F1F5F9');
  root.style.setProperty('--color-focus-ring', effectiveMode === 'dark' ? '#60A5FA' : '#2563EB');
  root.style.setProperty('--color-button', effective.button_color);
  root.style.setProperty('--color-button-hover', effective.button_hover_color);
  root.style.setProperty('--color-success', effective.success_color);
  root.style.setProperty('--color-warning', effective.warning_color);
  root.style.setProperty('--color-danger', effective.danger_color);
  root.style.setProperty('--color-info', effective.info_color);
  root.style.setProperty('--color-link', effective.link_color);
  root.style.setProperty('--color-badge', effective.badge_color);

  // 2. Button & Badge Contrast Text
  root.style.setProperty('--color-button-text', btnContrast);
  root.style.setProperty('--color-badge-text', badgeContrast);

  // 3. Derived Primary Glow / Alphas
  root.style.setProperty('--theme-rgb', rgbString);
  root.style.setProperty('--theme-light', `rgba(${rgbString}, 0.12)`);
  root.style.setProperty('--theme-border', `rgba(${rgbString}, 0.25)`);
  root.style.setProperty('--theme-glow', `rgba(${rgbString}, 0.35)`);

  // 4. Backward-Compatible Component Aliases
  root.style.setProperty('--theme-primary', effective.primary_color);
  root.style.setProperty('--theme-secondary', effective.secondary_color);
  root.style.setProperty('--theme-accent', effective.accent_color);
  root.style.setProperty('--theme-card-border', effective.border_color);
  root.style.setProperty('--theme-sidebar-bg', effective.sidebar_color);
  root.style.setProperty('--theme-sidebar-text', effective.muted_text_color);
  root.style.setProperty('--theme-header-bg', effective.navbar_color);
  root.style.setProperty('--theme-mobile-nav-bg', effective.navbar_color);
  root.style.setProperty('--theme-page-bg', effective.background_color);
  root.style.setProperty('--theme-text-primary', effective.text_color);
  root.style.setProperty('--theme-text-muted', effective.muted_text_color);
  root.style.setProperty('--theme-success', effective.success_color);
  root.style.setProperty('--theme-danger', effective.danger_color);
  root.style.setProperty('--theme-warning', effective.warning_color);

  // Tailwind core mappings
  root.style.setProperty('--primary', effective.primary_color);
  root.style.setProperty('--background', effective.background_color);
  root.style.setProperty('--foreground', effective.text_color);
  root.style.setProperty('--card', effective.surface_color);
  root.style.setProperty('--card-foreground', effective.text_color);
  root.style.setProperty('--muted-foreground', effective.muted_text_color);
  root.style.setProperty('--border', effective.border_color);
  root.style.setProperty('--brand', effective.primary_color);

  // 5. Dark Mode Class on Root
  if (effectiveMode === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
}

// ── Database Operations ─────────────────────────────────────────────
const STORAGE_PREFIX = 'dishgaze_theme_settings_';

export async function fetchRestaurantThemeSettings(
  restaurantId: string
): Promise<RestaurantThemeSettings> {
  const defaultSettings: RestaurantThemeSettings = {
    restaurant_id: restaurantId,
    theme: 'light',
    ...DEFAULT_THEME_COLORS,
  };

  if (!restaurantId) return defaultSettings;

  // 1. Try local storage cache for instant offline responsiveness
  let cached: Partial<RestaurantThemeSettings> | null = null;
  try {
    const rawCache = window.localStorage.getItem(`${STORAGE_PREFIX}${restaurantId}`);
    if (rawCache) cached = JSON.parse(rawCache);
  } catch {
    /* ignore */
  }

  try {
    // 2. Query restaurant_theme_settings table
    const { data, error } = await supabase
      .from('restaurant_theme_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!error && data) {
      const merged: RestaurantThemeSettings = {
        ...defaultSettings,
        id: data.id,
        restaurant_id: data.restaurant_id,
        theme: (data.theme as ThemeMode) || 'light',
        primary_color: data.primary_color || defaultSettings.primary_color,
        secondary_color: data.secondary_color || defaultSettings.secondary_color,
        accent_color: data.accent_color || defaultSettings.accent_color,
        background_color: data.background_color || defaultSettings.background_color,
        surface_color: data.surface_color || defaultSettings.surface_color,
        sidebar_color: data.sidebar_color || defaultSettings.sidebar_color,
        navbar_color: data.navbar_color || defaultSettings.navbar_color,
        text_color: data.text_color || defaultSettings.text_color,
        muted_text_color: data.muted_text_color || defaultSettings.muted_text_color,
        border_color: data.border_color || defaultSettings.border_color,
        button_color: data.button_color || defaultSettings.button_color,
        button_hover_color: data.button_hover_color || defaultSettings.button_hover_color,
        success_color: data.success_color || defaultSettings.success_color,
        warning_color: data.warning_color || defaultSettings.warning_color,
        danger_color: data.danger_color || defaultSettings.danger_color,
        info_color: data.info_color || defaultSettings.info_color,
        link_color: data.link_color || defaultSettings.link_color,
        badge_color: data.badge_color || defaultSettings.badge_color,
      };
      try {
        window.localStorage.setItem(`${STORAGE_PREFIX}${restaurantId}`, JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      return merged;
    }

    // 3. Fallback: Query restaurant_settings.theme_color
    const { data: fallbackData } = await supabase
      .from('restaurant_settings')
      .select('theme_color')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (fallbackData?.theme_color) {
      try {
        const parsed = JSON.parse(fallbackData.theme_color);
        const resolved: RestaurantThemeSettings = {
          ...defaultSettings,
          ...parsed,
          restaurant_id: restaurantId,
        };
        return resolved;
      } catch {
        // Was raw hex string
        return {
          ...defaultSettings,
          primary_color: normalizeHex(fallbackData.theme_color, defaultSettings.primary_color),
          button_color: normalizeHex(fallbackData.theme_color, defaultSettings.primary_color),
          badge_color: normalizeHex(fallbackData.theme_color, defaultSettings.primary_color),
        };
      }
    }
  } catch (err) {
    console.warn('Could not fetch remote theme settings, using local fallback:', err);
  }

  if (cached) {
    return { ...defaultSettings, ...cached, restaurant_id: restaurantId };
  }

  return defaultSettings;
}

export async function saveRestaurantThemeSettings(
  settings: RestaurantThemeSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      restaurant_id: settings.restaurant_id,
      theme: settings.theme,
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
      accent_color: settings.accent_color,
      background_color: settings.background_color,
      surface_color: settings.surface_color,
      sidebar_color: settings.sidebar_color,
      navbar_color: settings.navbar_color,
      text_color: settings.text_color,
      muted_text_color: settings.muted_text_color,
      border_color: settings.border_color,
      button_color: settings.button_color,
      button_hover_color: settings.button_hover_color,
      success_color: settings.success_color,
      warning_color: settings.warning_color,
      danger_color: settings.danger_color,
      info_color: settings.info_color,
      link_color: settings.link_color,
      badge_color: settings.badge_color,
      updated_at: new Date().toISOString(),
    };

    // Save locally first
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${settings.restaurant_id}`, JSON.stringify(settings));
    } catch {
      /* ignore */
    }

    // 1. Try upserting into restaurant_theme_settings
    const { error: upsertErr } = await supabase
      .from('restaurant_theme_settings')
      .upsert(payload, { onConflict: 'restaurant_id' });

    // 2. Also keep restaurant_settings.theme_color in sync as a fallback
    await supabase
      .from('restaurant_settings')
      .update({
        theme_color: JSON.stringify(settings),
        updated_at: new Date().toISOString(),
      })
      .eq('restaurant_id', settings.restaurant_id);

    if (upsertErr && upsertErr.code !== 'PGRST205') {
      console.warn('Upsert error on restaurant_theme_settings:', upsertErr);
    }

    return { success: true };
  } catch (err) {
    console.error('Error saving restaurant theme settings:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save theme settings',
    };
  }
}

// ── Legacy Compatibility Helpers ────────────────────────────────────
export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  cardBorderColor: string;
  sidebarBg: string;
  sidebarText: string;
  headerBg: string;
  mobileNavBg: string;
  successColor: string;
  dangerColor: string;
  warningColor: string;
  pageBg: string;
  textPrimary: string;
  textMuted: string;
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  primaryColor: DEFAULT_THEME_COLORS.primary_color,
  secondaryColor: DEFAULT_THEME_COLORS.secondary_color,
  accentColor: DEFAULT_THEME_COLORS.accent_color,
  cardBorderColor: DEFAULT_THEME_COLORS.border_color,
  sidebarBg: DEFAULT_THEME_COLORS.sidebar_color,
  sidebarText: DEFAULT_THEME_COLORS.muted_text_color,
  headerBg: DEFAULT_THEME_COLORS.navbar_color,
  mobileNavBg: DEFAULT_THEME_COLORS.navbar_color,
  successColor: DEFAULT_THEME_COLORS.success_color,
  dangerColor: DEFAULT_THEME_COLORS.danger_color,
  warningColor: DEFAULT_THEME_COLORS.warning_color,
  pageBg: DEFAULT_THEME_COLORS.background_color,
  textPrimary: DEFAULT_THEME_COLORS.text_color,
  textMuted: DEFAULT_THEME_COLORS.muted_text_color,
};

export function parseThemeConfig(raw: string | null | undefined): ThemeConfig {
  if (!raw) return { ...DEFAULT_THEME_CONFIG };
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith('#')) {
      return { ...DEFAULT_THEME_CONFIG, primaryColor: trimmed };
    }
    const parsed = JSON.parse(trimmed);
    return { ...DEFAULT_THEME_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_THEME_CONFIG };
  }
}

export function serializeThemeConfig(config: ThemeConfig | ThemeColors): string {
  return JSON.stringify(config);
}

export function applyThemeColorToDOM(hexColor: string = '#16A34A') {
  applyThemeToDOM({ ...DEFAULT_THEME_COLORS, primary_color: hexColor }, 'light');
}
