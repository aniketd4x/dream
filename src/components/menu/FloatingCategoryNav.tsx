import { X, Utensils } from "lucide-react";
import { useState, useEffect } from "react";

interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function FloatingCategoryNav({ tabs, activeId, onSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Close when a category is selected
  const handleSelect = (id: string) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating button - bottom left */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 left-4 z-50 flex flex-col items-center justify-center gap-0.5 rounded-full shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 lg:hidden size-14"
        style={{ backgroundColor: "var(--brand)" }}
        aria-label="Menu categories"
      >
        {isOpen ? (
          <>
            <X className="size-5 text-brand-contrast" />
            <span className="text-[9px] font-semibold leading-none text-brand-contrast">Close</span>
          </>
        ) : (
          <>
            <Utensils className="size-5 text-brand-contrast" />
            <span className="text-[9px] font-semibold leading-none text-brand-contrast">Menu</span>
          </>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Category drawer - slides up from bottom with vertical layout */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl bg-background/95 backdrop-blur-xl transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "70vh" }}
      >
        <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-border" />
        <div className="p-4 pb-8">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Jump to category</h3>
          <div className="flex flex-col gap-1.5">
            {tabs.map((tab) => {
              const active = tab.id === activeId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelect(tab.id)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 w-full ${
                    active
                      ? "text-brand-contrast shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                  style={active ? { backgroundColor: "var(--brand)" } : undefined}
                >
                  <span className="flex size-6 items-center justify-center text-xs opacity-60">
                    {tabs.indexOf(tab) + 1}
                  </span>
                  <span className="flex-1 text-left">{tab.label}</span>
                  {active && (
                    <span className="size-1.5 rounded-full bg-white/60" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}