// src/lib/themeContext.tsx
// Centralized React Context for Theme & Color Design System (Light & Dark Only)

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
  toggleTheme: () => Promise<void>;
  setColor: (key: keyof ThemeColors, value: string) => void;
  resetColor: (key: keyof ThemeColors) => void;
  resetAllColors: () => Promise<void>;
  saveColors: () => Promise<{ success: boolean; error?: string }>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { restaurant } = useAuth();
  const restaurantId = restaurant?.id || '';

  // Initialize theme: strictly 'light' | 'dark', default is 'light'
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('dishgaze-theme');
        if (saved === 'dark') return 'dark';
      } catch {
        /* ignore */
      }
    }
    return 'light';
  });

  const [colors, setColorsState] = useState<ThemeColors>({ ...DEFAULT_THEME_COLORS });
  const [savedColors, setSavedColors] = useState<ThemeColors>({ ...DEFAULT_THEME_COLORS });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Effective theme is 1:1 with theme ('light' or 'dark')
  const effectiveTheme: 'light' | 'dark' = theme;

  // Check if there are unsaved color changes
  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(DEFAULT_THEME_COLORS).some((k) => {
      const key = k as keyof ThemeColors;
      return colors[key]?.toUpperCase() !== savedColors[key]?.toUpperCase();
    });
  }, [colors, savedColors]);

  // Apply CSS variables & dark mode to DOM dynamically whenever colors or theme change
  useEffect(() => {
    applyThemeToDOM(colors, theme);
  }, [colors, theme]);

  // Fetch theme configuration per restaurant
  useEffect(() => {
    let cancelled = false;

    async function loadTheme() {
      if (!restaurantId) {
        applyThemeToDOM(DEFAULT_THEME_COLORS, theme);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const settings = await fetchRestaurantThemeSettings(restaurantId);
        if (!cancelled) {
          const loadedTheme: ThemeMode = settings.theme === 'dark' ? 'dark' : 'light';
          setThemeState(loadedTheme);
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem('dishgaze-theme', loadedTheme);
            } catch {
              /* ignore */
            }
          }

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
          applyThemeToDOM(loadedColors, loadedTheme);
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
  }, [restaurantId]);

  // Update theme mode and persist to localStorage + DB
  const setTheme = useCallback(
    async (newMode: ThemeMode) => {
      const mode: ThemeMode = newMode === 'dark' ? 'dark' : 'light';
      setThemeState(mode);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('dishgaze-theme', mode);
        } catch {
          /* ignore */
        }
      }
      applyThemeToDOM(colors, mode);

      if (restaurantId) {
        const payload: RestaurantThemeSettings = {
          restaurant_id: restaurantId,
          theme: mode,
          ...colors,
        };
        await saveRestaurantThemeSettings(payload);
      }
    },
    [colors, restaurantId]
  );

  // Toggle between Light and Dark
  const toggleTheme = useCallback(async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    await setTheme(next);
  }, [setTheme, theme]);

  // Update a single color immediately in UI & DOM
  const setColor = useCallback(
    (key: keyof ThemeColors, value: string) => {
      const normalized = normalizeHex(value, colors[key]);
      setColorsState((prev) => {
        const next = { ...prev, [key]: normalized };
        applyThemeToDOM(next, theme);
        return next;
      });
    },
    [colors, theme]
  );

  // Reset an individual color setting to default
  const resetColor = useCallback(
    (key: keyof ThemeColors) => {
      const defaultValue = DEFAULT_THEME_COLORS[key];
      setColorsState((prev) => {
        const next = { ...prev, [key]: defaultValue };
        applyThemeToDOM(next, theme);
        return next;
      });
    },
    [theme]
  );

  // Reset all colors to default palette, update DB, update UI immediately
  const resetAllColors = useCallback(async () => {
    const defaultColors = { ...DEFAULT_THEME_COLORS };
    setColorsState(defaultColors);
    setSavedColors(defaultColors);
    applyThemeToDOM(defaultColors, theme);

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
  }, [restaurantId, theme]);

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
      toggleTheme,
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
      toggleTheme,
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
