import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    try {
      const saved = window.localStorage.getItem("dishgaze-theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch {
      /* ignore */
    }
    return "light"; // Default is ALWAYS Light Mode
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      window.localStorage.setItem("dishgaze-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className={`inline-flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-sm transition-all hover:bg-secondary active:scale-95 ${className}`}
    >
      {theme === "light" ? (
        <Moon className="size-4 text-slate-700 dark:text-slate-200" />
      ) : (
        <Sun className="size-4 text-amber-400" />
      )}
    </button>
  );
}
