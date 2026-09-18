import { Star, Clock, MapPin, Search, X, ArrowLeft, UtensilsCrossed } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { initials, isWithinOpeningHours, formatMoney } from "@/lib/format";
import { FoodTypeDot } from "./FoodTypeDot";
import type { DiningTable, Restaurant, RestaurantSettings, MenuItem, Category } from "@/types/menu";

interface Props {
  restaurant: Restaurant;
  settings: RestaurantSettings | null;
  table: DiningTable | null;
  mode?: "table" | "direct" | "room";
  items?: MenuItem[];
  categories?: Category[];
  onSearchResults?: (results: MenuItem[]) => void;
}

export function MenuHeader({ 
  restaurant, 
  settings, 
  table, 
  mode = table ? "table" : "direct",
  items = [], 
  categories = [], 
  onSearchResults 
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const withinHours = isWithinOpeningHours(restaurant.opening_time, restaurant.closing_time);
  const flagOpen: boolean | null | undefined = settings?.restaurant_open;
  const isOpen = flagOpen === false ? false : withinHours === null ? true : withinHours;
  const canAcceptOrders = settings?.accept_orders !== false && flagOpen !== false;

  // Focus input when overlay opens
  useEffect(() => {
    if (isSearchFocused && overlayInputRef.current) {
      setTimeout(() => overlayInputRef.current?.focus(), 100);
    }
  }, [isSearchFocused]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      if (onSearchResults) {
        onSearchResults(items);
      }
      return;
    }

    const searchLower = query.toLowerCase().trim();
    
    const categoryMap = new Map<string, string>();
    categories.forEach(cat => {
      categoryMap.set(cat.id, cat.name);
    });

    const filtered = items.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(searchLower);
      const descriptionMatch = item.description?.toLowerCase().includes(searchLower) || false;
      const categoryName = item.category_id ? categoryMap.get(item.category_id) : null;
      const categoryMatch = categoryName?.toLowerCase().includes(searchLower) || false;
      return nameMatch || categoryMatch || descriptionMatch;
    });

    setSearchResults(filtered);
    if (onSearchResults) {
      onSearchResults(filtered);
    }
  };

  const closeSearch = () => {
    setIsSearchFocused(false);
    if (!searchQuery) {
      setSearchResults([]);
      if (onSearchResults) {
        onSearchResults(items);
      }
    }
  };

  // Get category name for an item
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    const category = categories.find(c => c.id === categoryId);
    return category?.name || null;
  };

  return (
    <header className="relative">
      <div className="relative h-44 w-full overflow-hidden sm:h-60 lg:h-72">
        {restaurant.cover_image_url ? (
          <img
            src={restaurant.cover_image_url}
            alt={`${restaurant.name} cover`}
            className="size-full object-cover"
            loading="eager"
          />
        ) : (
          <div
            className="size-full"
            style={{
              backgroundImage:
                "radial-gradient(120% 120% at 10% 0%, color-mix(in srgb, var(--brand) 70%, white) 0%, var(--brand) 45%, color-mix(in srgb, var(--brand) 60%, black) 100%)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
      </div>

      <div className="mx-auto -mt-12 max-w-5xl px-4 sm:px-6 relative z-10">
        <div className="flex items-end gap-4">
          <div className="size-20 shrink-0 overflow-hidden rounded-2xl sm:size-24 relative z-20">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={`${restaurant.name} logo`}
                className="size-full object-contain"
                loading="eager"
              />
            ) : (
              <div
                className="flex size-full items-center justify-center text-2xl font-bold text-brand-contrast"
                style={{ backgroundColor: "var(--brand)" }}
              >
                {initials(restaurant.name)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground shadow-sm border border-white/20">
              <span className={`size-2 rounded-full ${isOpen ? "bg-veg" : "bg-nonveg"}`} />
              {isOpen ? "Open now" : "Closed"}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl leading-tight font-extrabold text-foreground uppercase sm:text-3xl">
            {restaurant.name}
          </h1>
          {restaurant.description ? (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
              {restaurant.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {restaurant.rating !== null ? (
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {restaurant.rating.toFixed(1)}
                <span className="font-normal text-muted-foreground">
                  ({restaurant.total_reviews ?? 0} reviews)
                </span>
              </span>
            ) : null}
            {restaurant.opening_time && restaurant.closing_time ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-4" />
                {restaurant.opening_time.slice(0, 5)} – {restaurant.closing_time.slice(0, 5)}
              </span>
            ) : null}
            {restaurant.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" />
                {restaurant.city}
              </span>
            ) : null}
          </div>

          {/* Search Bar & Table / Direct Badge */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {table ? (
              <div
                className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-brand-contrast shadow-sm"
                style={{ backgroundColor: "var(--brand)" }}
              >
                <span className="opacity-80">You're at</span>
                <span>
                  Table {table.table_number ?? table.table_name ?? "—"}
                </span>
              </div>
            ) : (
              <div
                className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-brand-contrast shadow-sm"
                style={{ backgroundColor: "var(--brand)" }}
              >
                <UtensilsCrossed className="size-4" />
                <span>Digital Menu</span>
              </div>
            )}

            <div className="relative flex-1 min-w-[200px] max-w-xs sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onClick={() => setIsSearchFocused(true)}
                className="w-full rounded-full border border-border bg-card pl-9 pr-8 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand cursor-pointer"
                style={{ 
                  "--tw-ring-color": "var(--brand)",
                  borderColor: searchQuery ? "var(--brand)" : undefined
                } as React.CSSProperties}
                readOnly
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSearch("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Online Ordering Inactive Notice */}
          {!canAcceptOrders && (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-900 dark:text-amber-200">
              Currently not accepting live online orders. Viewing menu only.
            </div>
          )}
        </div>
      </div>

      {/* Search Overlay - Fullscreen when focused */}
      {isSearchFocused && (
        <div 
          className="fixed inset-0 z-50 bg-background/98 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSearch();
          }}
        >
          <div className="mx-auto max-w-3xl px-4 pt-6 pb-20">
            {/* Search Header */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={closeSearch}
                className="p-2 -ml-2 rounded-full hover:bg-accent transition-colors"
                aria-label="Close search"
              >
                <ArrowLeft className="size-6" />
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={overlayInputRef}
                  type="text"
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full rounded-full border-2 border-brand/30 bg-card px-12 py-3.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-brand"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-accent"
                    aria-label="Clear search"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Categories - Show only when no search query */}
            {!searchQuery && categories.length > 0 && (
              <div className="px-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Browse Categories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categories.slice(0, 8).map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        handleSearch(category.name);
                      }}
                      className="px-4 py-2 rounded-full bg-accent/50 hover:bg-accent text-sm transition-colors"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
                <div className="mt-6 text-sm text-muted-foreground">
                  {items.length} menu items available
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchQuery && (
              <div className="mt-4">
                {/* Results count */}
                <div className="px-4 py-3 text-sm text-muted-foreground border-b border-border/50">
                  {searchResults.length === 0 ? (
                    <span>No results found for "<strong className="text-foreground">{searchQuery}</strong>"</span>
                  ) : (
                    <span>Found <strong className="text-foreground">{searchResults.length}</strong> {searchResults.length === 1 ? 'result' : 'results'} for "<strong className="text-foreground">{searchQuery}</strong>"</span>
                  )}
                </div>

                {/* Results list */}
                <div className="mt-4 space-y-3 px-4">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-4 rounded-xl bg-card/50 hover:bg-card border border-border/50 transition-colors cursor-pointer"
                      onClick={() => {
                        // Close search and select this item
                        closeSearch();
                        // You can add additional logic here to scroll to or highlight the item
                      }}
                    >
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="size-16 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-foreground truncate">
                            {item.name}
                          </h4>
                          <span className="font-bold text-foreground whitespace-nowrap">
                            {formatMoney(item.price, restaurant.currency_symbol)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          {getCategoryName(item.category_id) && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/50 text-muted-foreground">
                              {getCategoryName(item.category_id)}
                            </span>
                          )}
                          <FoodTypeDot type={item.food_type} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}