// lib/theme.ts
import { Flame, Leaf, Sparkles, Moon, Crown } from 'lucide-react';

export interface ThemeTemplate {
  id: string;
  name: string;
  subtitle: string;
  primaryColor: string;
  secondaryColor: string;
  accentBg: string;
  gradientFrom: string;
  gradientTo: string;
  badgeBg: string;
  badgeText: string;
  tag: string;
  tagColor: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const THEME_TEMPLATES: ThemeTemplate[] = [
  {
    id: 'sunset-ember',
    name: 'Sunset Ember',
    subtitle: 'Warm Bistro & Grill',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
    accentBg: 'from-orange-500 to-amber-600',
    gradientFrom: '#f97316',
    gradientTo: '#d97706',
    badgeBg: 'bg-orange-500/15',
    badgeText: 'text-orange-600',
    tag: 'Default & Popular',
    tagColor: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Warm, vibrant, and appetizing. Perfect for cafes, burger joints, and family bistros.',
    icon: Flame,
  },
  {
    id: 'royal-emerald',
    name: 'Royal Emerald',
    subtitle: 'Fine Dining & Organic',
    primaryColor: '#059669',
    secondaryColor: '#047857',
    accentBg: 'from-emerald-600 to-teal-700',
    gradientFrom: '#059669',
    gradientTo: '#0f766e',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-700',
    tag: 'Fresh & Luxury',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Fresh, organic, and prestigious. Ideal for fine dining, vegetarian/vegan spots, and garden lounges.',
    icon: Leaf,
  },
  {
    id: 'crimson-velvet',
    name: 'Crimson Velvet',
    subtitle: 'Steakhouse & Italian Bar',
    primaryColor: '#e11d48',
    secondaryColor: '#be123c',
    accentBg: 'from-rose-600 to-red-700',
    gradientFrom: '#e11d48',
    gradientTo: '#be123c',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-600',
    tag: 'Bold & Passionate',
    tagColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Energetic, bold, and modern. Great for steakhouses, pizzerias, Italian kitchens, and cocktail lounges.',
    icon: Sparkles,
  },
  {
    id: 'midnight-indigo',
    name: 'Midnight Indigo',
    subtitle: 'Modern Lounge & Fusion',
    primaryColor: '#6366f1',
    secondaryColor: '#4f46e5',
    accentBg: 'from-indigo-600 to-violet-700',
    gradientFrom: '#6366f1',
    gradientTo: '#7c3aed',
    badgeBg: 'bg-indigo-500/15',
    badgeText: 'text-indigo-600',
    tag: 'Sleek & Tech',
    tagColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'Contemporary, sleek, and high-end. Tailored for sushi & Asian fusion, rooftop restro-bars, and clubs.',
    icon: Moon,
  },
  {
    id: 'golden-saffron',
    name: 'Golden Saffron',
    subtitle: 'Royal Heritage & Authentic',
    primaryColor: '#d97706',
    secondaryColor: '#b45309',
    accentBg: 'from-amber-600 to-yellow-600',
    gradientFrom: '#d97706',
    gradientTo: '#ca8a04',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-700',
    tag: 'Opulent & Heritage',
    tagColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Royal, opulent, and traditional. Ideal for Indian cuisine, Middle Eastern dining, and artisanal sweets.',
    icon: Crown,
  },
];

export interface ThemeInfo {
  primary: string;
  secondary: string;
  rgb: string;
  gradient: string;
  lightBg: string;
  borderGlow: string;
}

export function getThemeFromColor(hexColor: string = '#f97316'): ThemeInfo {
  let hex = hexColor.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    hex = 'f97316';
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Derive harmonious secondary gradient tone
  const matchedTemplate = THEME_TEMPLATES.find((t) => t.primaryColor.toLowerCase() === `#${hex.toLowerCase()}`);
  let secondary = matchedTemplate?.secondaryColor;

  if (!secondary) {
    const secR = Math.max(0, Math.floor(r * 0.85));
    const secG = Math.max(0, Math.floor(g * 0.85));
    const secB = Math.max(0, Math.floor(b * 0.85));
    secondary = `#${secR.toString(16).padStart(2, '0')}${secG.toString(16).padStart(2, '0')}${secB.toString(16).padStart(2, '0')}`;
  }

  const primary = `#${hex}`;
  const rgb = `${r}, ${g}, ${b}`;

  return {
    primary,
    secondary,
    rgb,
    gradient: `linear-gradient(135deg, ${primary}, ${secondary})`,
    lightBg: `rgba(${rgb}, 0.12)`,
    borderGlow: `rgba(${rgb}, 0.25)`,
  };
}

export function applyThemeToDOM(themeColor: string = '#f97316') {
  if (typeof document === 'undefined') return;
  const theme = getThemeFromColor(themeColor);
  const root = document.documentElement;

  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-secondary', theme.secondary);
  root.style.setProperty('--theme-rgb', theme.rgb);
  root.style.setProperty('--theme-light', `rgba(${theme.rgb}, 0.12)`);
  root.style.setProperty('--theme-border', `rgba(${theme.rgb}, 0.25)`);
  root.style.setProperty('--theme-glow', `rgba(${theme.rgb}, 0.35)`);
}
