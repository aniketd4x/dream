// src/components/ui/ThemeToggle.tsx
// Centralized Theme Toggle (Light / Dark / System)

import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '@/lib/themeContext';
import { triggerHaptic } from '@/lib/haptics';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, effectiveTheme, setTheme } = useTheme();

  const cycleTheme = () => {
    triggerHaptic('selection');
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getLabel = () => {
    if (theme === 'system') return `System Theme (${effectiveTheme})`;
    return `${theme === 'light' ? 'Light' : 'Dark'} Mode`;
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Current theme: ${getLabel()}. Click to change`}
      title={`Theme: ${getLabel()} (Click to toggle Light / Dark / System)`}
      className={`inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs transition-all hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 ${className}`}
    >
      {theme === 'system' ? (
        <Laptop className="size-4 text-emerald-500" />
      ) : effectiveTheme === 'dark' ? (
        <Moon className="size-4 text-indigo-400" />
      ) : (
        <Sun className="size-4 text-amber-500" />
      )}
    </button>
  );
}
