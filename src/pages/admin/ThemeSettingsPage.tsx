// src/pages/admin/ThemeSettingsPage.tsx
// Centralized Admin → Theme & Colors Settings Page

import React, { useState } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Laptop,
  RotateCcw,
  Save,
  Check,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { useTheme } from '@/lib/themeContext';
import {
  ThemeMode,
  ThemeColors,
  COLOR_CONFIG,
  DEFAULT_THEME_COLORS,
  getContrastTextColor,
} from '@/lib/theme';
import { triggerHaptic } from '@/lib/haptics';

export default function ThemeSettingsPage() {
  const {
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
  } = useTheme();

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleModeChange = async (mode: ThemeMode) => {
    triggerHaptic('selection');
    try {
      await setTheme(mode);
      showNotification('success', `Theme switched to ${mode === 'system' ? 'System / Auto' : mode.toUpperCase()} mode.`);
    } catch {
      showNotification('error', 'Failed to save theme selection.');
    }
  };

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    triggerHaptic('selection');
    setColor(key, value);
  };

  const handleResetSingleColor = (key: keyof ThemeColors) => {
    triggerHaptic('light');
    resetColor(key);
    showNotification('success', `${COLOR_CONFIG[key].label} reset to default.`);
  };

  const handleResetAll = async () => {
    triggerHaptic('light');
    if (window.confirm('Are you sure you want to reset all colors to the default palette?')) {
      try {
        await resetAllColors();
        showNotification('success', 'All colors restored to default palette successfully.');
      } catch {
        showNotification('error', 'Failed to reset colors.');
      }
    }
  };

  const handleSave = async () => {
    triggerHaptic('success');
    const res = await saveColors();
    if (res.success) {
      showNotification('success', 'Theme & color customization saved to database successfully!');
    } else {
      showNotification('error', res.error || 'Failed to save color settings.');
    }
  };

  // Group colors by category
  const groups: {
    title: string;
    description: string;
    keys: (keyof ThemeColors)[];
  }[] = [
    {
      title: 'Brand Colors',
      description: 'Core brand identity, active pills and primary highlights',
      keys: ['primary_color', 'secondary_color', 'accent_color'],
    },
    {
      title: 'Surfaces & Navigation',
      description: 'Background canvas, card surfaces, top navigation bar and sidebar',
      keys: ['background_color', 'surface_color', 'sidebar_color', 'navbar_color'],
    },
    {
      title: 'Typography & Borders',
      description: 'Text hierarchy, divider outlines and hyperlinks',
      keys: ['text_color', 'muted_text_color', 'border_color', 'link_color'],
    },
    {
      title: 'Buttons & Badges',
      description: 'Interactive button controls, hover states and status badges',
      keys: ['button_color', 'button_hover_color', 'badge_color'],
    },
    {
      title: 'Status & Feedback',
      description: 'System feedback, alert notices, success and warning badges',
      keys: ['success_color', 'warning_color', 'danger_color', 'info_color'],
    },
  ];

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 px-2 sm:px-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md animate-scale-in text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/90 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl border border-slate-700/60">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-theme-primary/20 border border-theme-primary/40 flex items-center justify-center text-white shadow-theme shrink-0">
              <Palette className="w-7 h-7 text-theme-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Theme & Colors</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase bg-theme-primary text-white shadow-xs">
                  Live
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                Configure your restaurant's brand colors and active theme mode. Changes update CSS variables and apply instantly throughout your dashboard.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleResetAll}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 hover:border-slate-500 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition native-press shadow-xs disabled:opacity-50"
              title="Restores all colors to default palette and updates database"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Colors to Default</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition native-press shadow-theme disabled:opacity-50 ${
                hasUnsavedChanges
                  ? 'bg-theme-primary hover:brightness-110 ring-2 ring-white/30'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : hasUnsavedChanges ? (
                <Save className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. THEME MODE SELECTOR ────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            1. Select Interface Theme
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose how your restaurant dashboard renders. Currently active:{' '}
            <span className="font-bold text-slate-900 dark:text-white capitalize">
              {theme} {theme === 'system' ? `(rendering ${effectiveTheme})` : ''}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Light Theme */}
          <button
            type="button"
            onClick={() => handleModeChange('light')}
            className={`p-4 rounded-2xl border text-left transition-all native-press relative flex flex-col justify-between gap-3 ${
              theme === 'light'
                ? 'border-theme-primary bg-theme-light/40 shadow-sm ring-2 ring-theme-primary/30'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              {theme === 'light' && (
                <span className="w-5 h-5 rounded-full bg-theme-primary text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Light Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clean light interface using your configured restaurant colors.
              </p>
            </div>
          </button>

          {/* Dark Theme */}
          <button
            type="button"
            onClick={() => handleModeChange('dark')}
            className={`p-4 rounded-2xl border text-left transition-all native-press relative flex flex-col justify-between gap-3 ${
              theme === 'dark'
                ? 'border-theme-primary bg-theme-light/40 shadow-sm ring-2 ring-theme-primary/30'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Moon className="w-5 h-5" />
              </div>
              {theme === 'dark' && (
                <span className="w-5 h-5 rounded-full bg-theme-primary text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Dark Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dark interface automatically ensuring high contrast & readability.
              </p>
            </div>
          </button>

          {/* System / Auto Theme */}
          <button
            type="button"
            onClick={() => handleModeChange('system')}
            className={`p-4 rounded-2xl border text-left transition-all native-press relative flex flex-col justify-between gap-3 ${
              theme === 'system'
                ? 'border-theme-primary bg-theme-light/40 shadow-sm ring-2 ring-theme-primary/30'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Laptop className="w-5 h-5" />
              </div>
              {theme === 'system' && (
                <span className="w-5 h-5 rounded-full bg-theme-primary text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">System / Auto Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically follows the user device's Light or Dark preference.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── 2. LIVE PREVIEW STUDIO CARD ───────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-theme-primary" />
          2. Live Interactive Preview
        </h2>
        <div
          className="rounded-3xl border p-6 transition-all duration-300 shadow-md overflow-hidden"
          style={{
            backgroundColor: 'var(--color-background)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Mini Sidebar Preview */}
            <div
              className="lg:col-span-4 p-4 rounded-2xl border flex flex-col justify-between gap-4"
              style={{
                backgroundColor: 'var(--color-sidebar)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-button-text)',
                    }}
                  >
                    DG
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight" style={{ color: 'var(--color-text)' }}>
                      Restaurant Preview
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-muted-text)' }}>
                      Sidebar Surface
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-button-text)',
                    }}
                  >
                    <span>Dashboard (Active)</span>
                    <span
                      className="px-1.5 py-0.2 rounded-full text-[9px]"
                      style={{
                        backgroundColor: 'var(--color-badge)',
                        color: 'var(--color-badge-text)',
                      }}
                    >
                      3
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
                    style={{ color: 'var(--color-muted-text)' }}
                  >
                    <span>Orders</span>
                  </div>
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
                    style={{ color: 'var(--color-muted-text)' }}
                  >
                    <span>Menu Items</span>
                  </div>
                </div>
              </div>

              <div
                className="p-2.5 rounded-xl border text-[11px]"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
                  Sidebar Color Preview
                </p>
                <p className="text-[10px]" style={{ color: 'var(--color-muted-text)' }}>
                  Customizable independently
                </p>
              </div>
            </div>

            {/* Mini Dashboard Content Preview */}
            <div className="lg:col-span-8 space-y-4">
              {/* Mini Navbar */}
              <div
                className="p-3.5 rounded-2xl border flex items-center justify-between shadow-xs"
                style={{
                  backgroundColor: 'var(--color-navbar)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                  Navbar Header Bar
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: getContrastTextColor(colors.accent_color),
                    }}
                  >
                    Accent Chip
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--color-badge)',
                      color: 'var(--color-badge-text)',
                    }}
                  >
                    Badge Color
                  </span>
                </div>
              </div>

              {/* Mini Surface Card */}
              <div
                className="p-5 rounded-2xl border shadow-sm space-y-4"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                      Card & Surface Preview
                    </h4>
                    <p className="text-xs" style={{ color: 'var(--color-muted-text)' }}>
                      Muted text color preview
                    </p>
                  </div>
                  <span className="text-xs font-bold underline" style={{ color: 'var(--color-link)' }}>
                    Link Color
                  </span>
                </div>

                {/* Button Showcase */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-button)',
                      color: 'var(--color-button-text)',
                    }}
                  >
                    Button Color
                  </button>

                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-button-hover)',
                      color: getContrastTextColor(colors.button_hover_color),
                    }}
                  >
                    Button Hover
                  </button>

                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-xs font-bold transition"
                    style={{
                      backgroundColor: 'var(--color-secondary)',
                      color: getContrastTextColor(colors.secondary_color),
                    }}
                  >
                    Secondary
                  </button>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{
                      backgroundColor: 'var(--color-success)',
                      color: getContrastTextColor(colors.success_color),
                    }}
                  >
                    Success
                  </span>
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{
                      backgroundColor: 'var(--color-warning)',
                      color: getContrastTextColor(colors.warning_color),
                    }}
                  >
                    Warning
                  </span>
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{
                      backgroundColor: 'var(--color-danger)',
                      color: getContrastTextColor(colors.danger_color),
                    }}
                  >
                    Danger / Error
                  </span>
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{
                      backgroundColor: 'var(--color-info)',
                      color: getContrastTextColor(colors.info_color),
                    }}
                  >
                    Info
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. DETAILED COLOR CUSTOMIZATION CONTROLS ───────────────────── */}
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            3. Color Customization (18 Settings)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Each color includes an interactive color picker, direct HEX input field, real-time live preview, and individual reset option.
          </p>
        </div>

        {groups.map((group) => (
          <div
            key={group.title}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4"
          >
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{group.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{group.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {group.keys.map((key) => {
                const config = COLOR_CONFIG[key];
                const currentColor = colors[key] || DEFAULT_THEME_COLORS[key];
                const isDefault = currentColor.toUpperCase() === DEFAULT_THEME_COLORS[key].toUpperCase();

                return (
                  <div
                    key={key}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between gap-3"
                  >
                    {/* Top Row: Label & Reset */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                          {config.label}
                        </label>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {config.description}
                        </p>
                      </div>

                      {/* Reset Option for Individual Color */}
                      <button
                        type="button"
                        onClick={() => handleResetSingleColor(key)}
                        disabled={isDefault}
                        title={`Reset ${config.label} to default (${DEFAULT_THEME_COLORS[key]})`}
                        className={`p-1.5 rounded-lg transition native-press shrink-0 ${
                          isDefault
                            ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Controls: Color Picker + HEX Input + Live Preview */}
                    <div className="flex items-center gap-2.5">
                      {/* Color Picker Swatch */}
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 shadow-xs cursor-pointer group">
                        <input
                          type="color"
                          value={currentColor}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer border-0 p-0 opacity-0"
                          title={`Click to pick ${config.label}`}
                        />
                        <div
                          className="w-full h-full transition group-hover:scale-110"
                          style={{ backgroundColor: currentColor }}
                        />
                      </div>

                      {/* HEX Input Field */}
                      <div className="relative flex-1">
                        <input
                          type="text"
                          maxLength={7}
                          value={currentColor}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase tracking-wider"
                          placeholder="#000000"
                        />
                      </div>

                      {/* Live Preview Indicator */}
                      <div
                        className="w-7 h-7 rounded-full border border-black/10 dark:border-white/20 shrink-0 shadow-xs"
                        style={{ backgroundColor: currentColor }}
                        title={`Current Preview: ${currentColor}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Save / Reset Bar */}
      <div className="sticky bottom-4 z-40 bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-xs font-medium text-slate-300">
            {hasUnsavedChanges
              ? 'You have unsaved color adjustments. Click Save to persist them to the database.'
              : 'All theme settings and colors are saved and up to date.'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleResetAll}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition native-press"
          >
            Reset to Default
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-theme-primary hover:brightness-110 text-white text-xs font-bold shadow-theme transition native-press disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Theme Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
