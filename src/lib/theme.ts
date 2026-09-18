// lib/theme.ts

export interface ThemeConfig {
  primaryColor: string;      // Buttons, active pills, CTA highlights
  secondaryColor: string;    // Gradient end, secondary accents
  accentColor: string;       // Badges, count chips, tags
  navbarBg: string;          // Admin sidebar / top navbar background
  cardBorderColor: string;   // Card border accent line
  successColor: string;      // Open status, positive states
  dangerColor: string;       // Closed status, destructive actions
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  primaryColor: '#f97316',
  secondaryColor: '#ea580c',
  accentColor: '#fb923c',
  navbarBg: '#0f172a',
  cardBorderColor: '#fed7aa',
  successColor: '#059669',
  dangerColor: '#e11d48',
};

// Quick palette presets — coherent full-theme looks
export interface ThemePalette {
  id: string;
  name: string;
  description: string;
  preview: string; // primary color used for swatch
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
      navbarBg: '#0f172a',
      cardBorderColor: '#fed7aa',
      successColor: '#059669',
      dangerColor: '#e11d48',
    },
  },
  {
    id: 'emerald',
    name: 'Royal Emerald',
    description: 'Fresh & prestigious — fine dining, organic, garden lounges',
    preview: '#059669',
    config: {
      primaryColor: '#059669',
      secondaryColor: '#047857',
      accentColor: '#34d399',
      navbarBg: '#064e3b',
      cardBorderColor: '#a7f3d0',
      successColor: '#10b981',
      dangerColor: '#f43f5e',
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
      navbarBg: '#1f0a14',
      cardBorderColor: '#fecdd3',
      successColor: '#16a34a',
      dangerColor: '#dc2626',
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
      navbarBg: '#1e1b4b',
      cardBorderColor: '#c7d2fe',
      successColor: '#059669',
      dangerColor: '#e11d48',
    },
  },
  {
    id: 'saffron',
    name: 'Golden Saffron',
    description: 'Royal & heritage — Indian, Middle Eastern, artisan sweets',
    preview: '#d97706',
    config: {
      primaryColor: '#d97706',
      secondaryColor: '#b45309',
      accentColor: '#fbbf24',
      navbarBg: '#1c1208',
      cardBorderColor: '#fde68a',
      successColor: '#16a34a',
      dangerColor: '#dc2626',
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
      navbarBg: '#020617',
      cardBorderColor: '#cbd5e1',
      successColor: '#16a34a',
      dangerColor: '#dc2626',
    },
  },
];

// Parse theme_color from DB — supports both legacy hex string and JSON ThemeConfig
export function parseThemeConfig(raw: string | null | undefined): ThemeConfig {
  if (!raw) return { ...DEFAULT_THEME_CONFIG };
  const trimmed = raw.trim();
  // Legacy: plain hex color
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

// Serialize for DB storage
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

  root.style.setProperty('--theme-primary', config.primaryColor);
  root.style.setProperty('--theme-secondary', config.secondaryColor);
  root.style.setProperty('--theme-accent', config.accentColor);
  root.style.setProperty('--theme-navbar-bg', config.navbarBg);
  root.style.setProperty('--theme-card-border', config.cardBorderColor);
  root.style.setProperty('--theme-success', config.successColor);
  root.style.setProperty('--theme-danger', config.dangerColor);

  // Derived utility values from primary
  root.style.setProperty('--theme-rgb', rgb);
  root.style.setProperty('--theme-light', `rgba(${rgb}, 0.12)`);
  root.style.setProperty('--theme-border', `rgba(${rgb}, 0.25)`);
  root.style.setProperty('--theme-glow', `rgba(${rgb}, 0.35)`);
}

// Legacy single-color apply for compatibility
export function applyThemeColorToDOM(hexColor: string = '#f97316') {
  applyThemeToDOM({ ...DEFAULT_THEME_CONFIG, primaryColor: hexColor });
}
