interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function CategoryTabs({ tabs, activeId, onSelect }: Props) {
  return (
    <nav
      aria-label="Menu categories"
      className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="no-scrollbar flex gap-2 overflow-x-auto py-3">
          {tabs.map((tab) => {
            const active = tab.id === activeId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelect(tab.id)}
                aria-current={active ? "true" : undefined}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  active
                    ? "text-brand-contrast shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
                style={active ? { backgroundColor: "var(--brand)" } : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}