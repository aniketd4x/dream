// src/lib/themeContext.tsx
// Centralized React Context for Theme & Color Customization

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  ThemeMode,
  ThemeColors,
  RestaurantThemeSettings,
  DEFAULT_THEME_COLORS,
  applyThemeToDOM,
  fetchRestaurantThemeSettings,
  saveRestaurantThemeSettings,
  normalizeHex,
} from './theme';
import { useAuth } from './auth';

interface ThemeContextValue {
  theme: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  colors: ThemeColors;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  setTheme: (mode: ThemeMode) => Promise<void>;
  setColor: (key: keyof ThemeColors, value: string) => void;
  resetColor: (key: keyof ThemeColors) => void;
  resetAllColors: () => Promise<void>;
  saveColors: () => Promise<{ success: boolean; error?: string }>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { restaurant } = useAuth();
  const restaurantId = restaurant?.id || '';

  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [colors, setColorsState] = useState<ThemeColors>({ ...DEFAULT_THEME_COLORS });
  const [savedColors, setSavedColors] = useState<ThemeColors>({ ...DEFAULT_THEME_COLORS });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Calculate effective mode: 'light' | 'dark'
  const effectiveTheme: 'light' | 'dark' = useMemo(() => {
    if (theme === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return theme;
  }, [theme, systemIsDark]);

  // Check if there are unsaved color changes
  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(DEFAULT_THEME_COLORS).some((k) => {
      const key = k as keyof ThemeColors;
      return colors[key]?.toUpperCase() !== savedColors[key]?.toUpperCase();
    });
  }, [colors, savedColors]);

  // Listen to OS prefers-color-scheme changes in real-time
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else if ('addListener' in mediaQuery) {
      // Legacy browser support
      (mediaQuery as any).addListener(handler);
      return () => (mediaQuery as any).removeListener(handler);
    }
  }, []);

  // Apply CSS variables & dark mode to DOM dynamically whenever colors or effective theme change
  useEffect(() => {
    applyThemeToDOM(colors, effectiveTheme);
  }, [colors, effectiveTheme]);

  // Fetch theme configuration per restaurant
  useEffect(() => {
    let cancelled = false;

    async function loadTheme() {
      if (!restaurantId) {
        // Fallback for non-restaurant views or initial render
        applyThemeToDOM(DEFAULT_THEME_COLORS, effectiveTheme);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const settings = await fetchRestaurantThemeSettings(restaurantId);
        if (!cancelled) {
          setThemeState(settings.theme || 'light');
          const loadedColors: ThemeColors = {
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
          };
          setColorsState(loadedColors);
          setSavedColors(loadedColors);
          applyThemeToDOM(loadedColors, settings.theme === 'system' ? (systemIsDark ? 'dark' : 'light') : settings.theme);
        }
      } catch (err) {
        console.error('Failed to load restaurant theme:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTheme();

    return () => {
      cancelled = true;
    };
  }, [restaurantId, systemIsDark]);

  // Update theme mode and persist to DB immediately
  const setTheme = useCallback(
    async (newMode: ThemeMode) => {
      setThemeState(newMode);
      const targetEffective = newMode === 'system' ? (systemIsDark ? 'dark' : 'light') : newMode;
      applyThemeToDOM(colors, targetEffective);

      if (restaurantId) {
        const payload: RestaurantThemeSettings = {
          restaurant_id: restaurantId,
          theme: newMode,
          ...colors,
        };
        await saveRestaurantThemeSettings(payload);
      }
    },
    [colors, restaurantId, systemIsDark]
  );

  // Update a single color immediately in UI & DOM
  const setColor = useCallback(
    (key: keyof ThemeColors, value: string) => {
      const normalized = normalizeHex(value, colors[key]);
      setColorsState((prev) => {
        const next = { ...prev, [key]: normalized };
        applyThemeToDOM(next, effectiveTheme);
        return next;
      });
    },
    [colors, effectiveTheme]
  );

  // Reset an individual color setting to default
  const resetColor = useCallback(
    (key: keyof ThemeColors) => {
      const defaultValue = DEFAULT_THEME_COLORS[key];
      setColorsState((prev) => {
        const next = { ...prev, [key]: defaultValue };
        applyThemeToDOM(next, effectiveTheme);
        return next;
      });
    },
    [effectiveTheme]
  );

  // Reset all colors to default palette, update DB, update UI immediately
  const resetAllColors = useCallback(async () => {
    const defaultColors = { ...DEFAULT_THEME_COLORS };
    setColorsState(defaultColors);
    setSavedColors(defaultColors);
    applyThemeToDOM(defaultColors, effectiveTheme);

    if (restaurantId) {
      setIsSaving(true);
      try {
        const payload: RestaurantThemeSettings = {
          restaurant_id: restaurantId,
          theme: theme,
          ...defaultColors,
        };
        await saveRestaurantThemeSettings(payload);
      } finally {
        setIsSaving(false);
      }
    }
  }, [effectiveTheme, restaurantId, theme]);

  // Save current color configuration
  const saveColors = useCallback(async () => {
    if (!restaurantId) return { success: true };
    setIsSaving(true);
    try {
      const payload: RestaurantThemeSettings = {
        restaurant_id: restaurantId,
        theme: theme,
        ...colors,
      };
      const res = await saveRestaurantThemeSettings(payload);
      if (res.success) {
        setSavedColors({ ...colors });
      }
      return res;
    } finally {
      setIsSaving(false);
    }
  }, [colors, restaurantId, theme]);

  const contextValue = useMemo(
    () => ({
      theme,
      effectiveTheme,
      colors,
      isLoading,
      isSaving,
      hasUnsavedChanges,
      setTheme,
      setColor,
      resetColor,
      resetAllColors,
      saveColors,
    }),
    [
      theme,
      effectiveTheme,
      colors,
      isLoading,
      isSaving,
      hasUnsavedChanges,
      setTheme,
      setColor,
      resetColor,
      resetAllColors,
      saveColors,
    ]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
