import { Search, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { MenuItem } from "@/types/menu";

interface Props {
  items: MenuItem[];
  onSearchResults: (results: MenuItem[]) => void;
  placeholder?: string;
}

export function SearchBar({ items, onSearchResults, placeholder = "Search menu..." }: Props) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length === 0) {
      onSearchResults(items);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const results = items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm) ||
        (item.description && item.description.toLowerCase().includes(searchTerm)) ||
        (item.variants &&
          item.variants.some((v) => v.name.toLowerCase().includes(searchTerm)))
    );
    onSearchResults(results);
  }, [query, items, onSearchResults]);

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex-1 min-w-[120px] max-w-[300px]">
      <div
        className={`flex items-center gap-2 rounded-xl border bg-card px-3 py-1.5 transition-all duration-200 ${
          isFocused ? "border-ring shadow-[0_0_0_2px_var(--ring)]" : "border-border"
        }`}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Search results count - subtle indicator */}
      {query.trim().length > 0 && (
        <span className="absolute -bottom-5 right-0 text-[10px] font-medium text-muted-foreground">
          {items.filter((item) =>
            item.name.toLowerCase().includes(query.toLowerCase().trim())
          ).length}{" "}
          results
        </span>
      )}
    </div>
  );
}