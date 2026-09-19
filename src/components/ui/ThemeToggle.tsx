// src/components/ui/ThemeToggle.tsx
// Production-Ready Light & Dark Theme Switcher (Stripe / Linear style)

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/themeContext';
import { triggerHaptic } from '@/lib/haptics';

export function ThemeToggle({
  className = '',
  variant = 'icon',
}: {
  className?: string;
  variant?: 'icon' | 'segmented';
}) {
  const { theme, toggleTheme, setTheme } = useTheme();

  const handleToggle = () => {
    triggerHaptic('selection');
    toggleTheme();
  };

  if (variant === 'segmented') {
    return (
      <div
        className={`inline-flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 ${className}`}
        role="group"
        aria-label="Theme selector"
      >
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setTheme('light');
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            theme === 'light'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          aria-pressed={theme === 'light'}
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setTheme('dark');
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            theme === 'dark'
              ? 'bg-slate-800 text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          aria-pressed={theme === 'dark'}
        >
          <Moon className="w-3.5 h-3.5 text-blue-400" />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      title={theme === 'dark' ? 'Dark Theme (Click for Light)' : 'Light Theme (Click for Dark)'}
      className={`relative inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xs transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 ${className}`}
    >
      {theme === 'dark' ? (
        <Moon className="size-4 text-blue-400 transition-transform duration-200 hover:-rotate-12" />
      ) : (
        <Sun className="size-4 text-amber-500 transition-transform duration-200 hover:rotate-45" />
      )}
    </button>
  );
}
