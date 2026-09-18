import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { loadMenu, createOrder } from "@/lib/menuService";
import { CartProvider, useCart } from "@/hooks/useCart";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { FloatingCategoryNav } from "@/components/menu/FloatingCategoryNav";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { VariantModal } from "@/components/menu/VariantModal";
import { CartBar } from "@/components/menu/CartBar";
import { CartDrawer } from "@/components/menu/CartDrawer";
import { CartLines, TotalsBlock, computeTotals } from "@/components/menu/CartSummary";
import { OrderSuccess } from "@/components/menu/OrderSuccess";
import { MenuSkeleton } from "@/components/menu/MenuSkeleton";
import { MenuErrorState } from "@/components/menu/MenuErrorState";
import { DietaryFilterBar, type DietaryFilter } from "@/components/menu/DietaryFilterBar";
import type { MenuItem, MenuPayload, PlacedOrder, OrderType } from "@/types/menu";

const DEFAULT_BRAND = "#16A34A";

function normalizeColor(value: string | null | undefined) {
  if (!value) return DEFAULT_BRAND;
  const v = value.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : DEFAULT_BRAND;
}

function contrastFor(hex: string) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.6 ? "#111111" : "#ffffff";
}

function errorCodeFrom(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  for (const code of ["INVALID_QR", "TABLE_INACTIVE", "RESTAURANT_INACTIVE", "ORDERING_DISABLED", "EMPTY_MENU"]) {
    if (message.includes(code)) return code;
  }
  if (/not valid/i.test(message)) return "INVALID_QR";
  if (/restaurant is currently unavailable/i.test(message)) return "RESTAURANT_INACTIVE";
  return "NETWORK";
}

export function QRMenuPage() {
  const { qrToken = "" } = useParams<{ qrToken: string }>();

  const query = useQuery({
    queryKey: ["qr-menu", qrToken],
    queryFn: () => loadMenu(qrToken),
    retry: 1,
    staleTime: 60_000,
    enabled: !!qrToken,
  });

  useEffect(() => {
    if (qrToken) {
      try {
        window.localStorage.setItem("dishgaze-last-qr-token", qrToken);
      } catch {
        /* ignore */
      }
    }
  }, [qrToken]);

  if (query.isPending) return <MenuSkeleton />;

  if (query.isError) {
    return (
      <MenuErrorState code={errorCodeFrom(query.error)} onRetry={() => void query.refetch()} />
    );
  }

  if (!query.data) {
    return <MenuErrorState code="INVALID_QR" />;
  }

  return (
    <CartProvider>
      <MenuScreen qrToken={qrToken} data={query.data} />
    </CartProvider>
  );
}

function MenuScreen({ qrToken, data }: { qrToken: string; data: MenuPayload }) {
  const { restaurant, settings, table, mode, availableTables = [], categories, items } = data;
  const cart = useCart();

  const [activeTab, setActiveTab] = useState("all");
  const [dietaryFilter, setDietaryFilter] = useState<DietaryFilter>("all");
  const [variantItem, setVariantItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [lastOrder, setLastOrder] = useState<{ id: string; number: string } | null>(null);
  const [searchResults, setSearchResults] = useState<MenuItem[] | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const suppressSpy = useRef(false);

  const storageKey = `qr-last-order:${qrToken}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setLastOrder(JSON.parse(raw) as { id: string; number: string });
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const brand = normalizeColor(settings?.theme_color ?? restaurant.primary_color);
  const brandContrast = contrastFor(brand);
  const currency = restaurant.currency_symbol;
  const canOrder = settings?.accept_orders !== false && settings?.restaurant_open !== false;

  const dietaryCounts = useMemo(() => {
    const c = { all: items.length, veg: 0, nonveg: 0, vegan: 0, egg: 0 };
    for (const item of items) {
      const norm = (item.food_type ?? "").toLowerCase().replace(/[\s_-]/g, "");
      if (norm === "vegan") c.vegan++;
      else if (norm === "veg" || norm === "vegetarian") c.veg++;
      else if (norm === "nonveg" || norm === "nonvegetarian") c.nonveg++;
      else if (norm === "egg") c.egg++;
    }
    return c;
  }, [items]);

  const matchesDietary = useCallback(
    (item: MenuItem) => {
      if (dietaryFilter === "all") return true;
      const norm = (item.food_type ?? "").toLowerCase().replace(/[\s_-]/g, "");
      if (dietaryFilter === "vegan") return norm === "vegan";
      if (dietaryFilter === "veg") return norm === "veg" || norm === "vegetarian";
      if (dietaryFilter === "nonveg") return norm === "nonveg" || norm === "nonvegetarian";
      if (dietaryFilter === "egg") return norm === "egg";
      return true;
    },
    [dietaryFilter]
  );

  const recommended = useMemo(() => items.filter((i) => i.is_recommended), [items]);
  const grouped = useMemo(
    () =>
      categories
        .map((c) => ({ category: c, items: items.filter((i) => i.category_id === c.id) }))
        .filter((g) => g.items.length > 0),
    [categories, items]
  );
  const uncategorized = useMemo(
    () => items.filter((i) => !i.category_id || !categories.some((c) => c.id === i.category_id)),
    [items, categories]
  );

  const handleSearchResults = useCallback((results: MenuItem[]) => {
    setSearchResults(results);
  }, []);

  const tabs = useMemo(() => {
    const list = [{ id: "all", label: "All" }];
    if (recommended.length > 0) list.push({ id: "recommended", label: "Recommended" });
    for (const g of grouped) list.push({ id: g.category.id, label: g.category.name });
    if (uncategorized.length > 0) list.push({ id: "more", label: "More" });
    return list;
  }, [recommended.length, grouped, uncategorized.length]);

  const scrollTo = useCallback((id: string) => {
    setActiveTab(id);
    suppressSpy.current = true;
    window.setTimeout(() => (suppressSpy.current = false), 700);
    if (id === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = sectionRefs.current[id];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (suppressSpy.current) return;
      let current = "all";
      for (const tab of tabs) {
        const el = sectionRefs.current[tab.id];
        if (el && el.getBoundingClientRect().top - 90 <= 0) current = tab.id;
      }
      setActiveTab(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [tabs]);

  const handleAdd = useCallback(
    (item: MenuItem) => {
      if (item.has_variant && item.variants.length > 0) {
        setVariantItem(item);
        return;
      }
      cart.add({
        itemId: item.id,
        variantId: null,
        name: item.name,
        variantName: null,
        unitPrice: item.price,
        imageUrl: item.image_url,
        foodType: item.food_type,
      });
    },
    [cart]
  );

  const totals = computeTotals(cart.subtotal, settings?.gst_percent, settings?.service_charge);

  const mutation = useMutation({
    mutationFn: (payload: {
      name: string;
      mobile: string;
      notes: string;
      orderType: OrderType;
      tableNumber?: string | null;
      diningTableId?: string | null;
    }) =>
      createOrder({
        identifier: qrToken,
        qrToken,
        customerName: payload.name,
        customerMobile: payload.mobile,
        notes: payload.notes,
        orderType: payload.orderType,
        tableNumber: payload.tableNumber,
        diningTableId: payload.diningTableId,
        lines: cart.lines.map((l) => ({
          itemId: l.itemId,
          variantId: l.variantId,
          quantity: l.quantity,
        })),
      }),
    onSuccess: (result) => {
      setCartOpen(false);
      cart.clear();
      setOrder(result);
      const saved = { id: result.orderId, number: result.orderNumber };
      setLastOrder(saved);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(saved));
        window.localStorage.setItem("dishgaze-last-qr-token", qrToken);

        const histKey = `qr-orders-history:${qrToken}`;
        const rawHist = window.localStorage.getItem(histKey);
        const hist = rawHist ? (JSON.parse(rawHist) as Array<{ id: string; number: string }>) : [];
        hist.push(saved);
        window.localStorage.setItem(histKey, JSON.stringify(hist));
      } catch {
        /* storage unavailable */
      }
      window.scrollTo({ top: 0 });
    },
  });

  const brandVars = {
    ["--brand" as string]: brand,
    ["--brand-contrast" as string]: brandContrast,
  } as React.CSSProperties;

  if (order) {
    return (
      <div style={brandVars}>
        <OrderSuccess
          order={order}
          currencySymbol={currency}
          onBackToMenu={() => setOrder(null)}
        />
      </div>
    );
  }

  const isEmptyMenu = items.length === 0;
  const isRoomMode = mode === 'room' || (table?.table_number && /^room/i.test(table.table_number.trim()));
  const tableLabel = isRoomMode
    ? `Delivering to ${table?.table_number?.replace(/^room\s*/i, 'Room ') || 'Room'} · ${restaurant.name}`
    : table
    ? `Table ${table.table_number ?? table.table_name ?? "—"} · ${restaurant.name}`
    : `Direct Digital Menu · ${restaurant.name}`;

  const filterItem = (item: MenuItem) => {
    const inSearch = searchResults === null || searchResults.some((r) => r.id === item.id);
    const inDiet = matchesDietary(item);
    return inSearch && inDiet;
  };

  return (
    <div style={brandVars} className="min-h-screen bg-background pb-28 lg:pb-10">
      {isRoomMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold">
              <span>🏨</span>
              <span>In-Room Dining for <strong>{table?.table_number?.replace(/^room\s*/i, 'Room ') || 'Room'}</strong></span>
            </span>
            <Link
              to={`/room/${qrToken}`}
              className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-bold hover:underline"
            >
              <span>Room Services</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
      <MenuHeader
        restaurant={restaurant}
        settings={settings}
        table={table}
        mode={mode}
        items={items}
        categories={categories}
        onSearchResults={handleSearchResults}
      />

      {lastOrder ? (
        <div className="mx-auto mt-5 max-w-5xl px-4 sm:px-6">
          <Link
            to={`/order/${lastOrder.id}`}
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-brand-contrast"
              style={{ backgroundColor: "var(--brand)" }}
            >
              <Receipt className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">Track your order</span>
              <span className="block text-xs text-muted-foreground">
                Order #{lastOrder.number} · live kitchen status
              </span>
            </span>
            <span className="text-sm font-bold" style={{ color: "var(--brand)" }}>
              View →
            </span>
          </Link>
        </div>
      ) : null}

      {!canOrder ? (
        <div className="mx-auto mt-5 max-w-5xl px-4 sm:px-6">
          <p className="rounded-2xl border border-border bg-secondary px-4 py-3 text-center text-sm font-semibold text-muted-foreground">
            Currently not accepting live online orders. Viewing menu only.
          </p>
        </div>
      ) : null}

      {isEmptyMenu ? (
        <div className="mt-8">
          <MenuErrorState code="EMPTY_MENU" />
        </div>
      ) : (
        <>
          <FloatingCategoryNav tabs={tabs} activeId={activeTab} onSelect={scrollTo} />

          <div className="mx-auto max-w-5xl px-4 pt-3 sm:px-6">
            <DietaryFilterBar
              selected={dietaryFilter}
              onChange={setDietaryFilter}
              counts={dietaryCounts}
            />
          </div>

          <div className="mx-auto max-w-5xl gap-8 px-4 sm:px-6 lg:flex lg:items-start">
            <main className="min-w-0 flex-1 py-6">
              {searchResults !== null && searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No items match your search.</p>
                </div>
              ) : (
                <>
                  {recommended.length > 0 && (
                    <Section
                      id="recommended"
                      title="⭐ Recommended"
                      subtitle="Guest favourites picked by the chef"
                      refs={sectionRefs}
                    >
                      <ItemGrid
                        items={recommended.filter(filterItem)}
                        currency={currency}
                        canOrder={canOrder}
                        cart={cart}
                        onAdd={handleAdd}
                      />
                    </Section>
                  )}

                  {grouped.map((group) => {
                    const groupItems = group.items.filter(filterItem);
                    if (groupItems.length === 0 && (dietaryFilter !== "all" || searchResults !== null)) {
                      return null;
                    }
                    return (
                      <Section
                        key={group.category.id}
                        id={group.category.id}
                        title={group.category.name}
                        subtitle={group.category.description}
                        refs={sectionRefs}
                      >
                        <ItemGrid
                          items={groupItems}
                          currency={currency}
                          canOrder={canOrder}
                          cart={cart}
                          onAdd={handleAdd}
                        />
                      </Section>
                    );
                  })}

                  {uncategorized.length > 0 && (
                    <Section id="more" title="More" subtitle={null} refs={sectionRefs}>
                      <ItemGrid
                        items={uncategorized.filter(filterItem)}
                        currency={currency}
                        canOrder={canOrder}
                        cart={cart}
                        onAdd={handleAdd}
                      />
                    </Section>
                  )}
                </>
              )}
            </main>

            <aside className="hidden w-80 shrink-0 py-6 lg:block">
              <div className="sticky top-24 space-y-4 rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
                <h2 className="text-lg font-extrabold">Your order</h2>
                {cart.lines.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Your cart is empty. Add items from the menu.
                  </p>
                ) : (
                  <>
                    <CartLines
                      lines={cart.lines}
                      currencySymbol={currency}
                      onIncrease={cart.increase}
                      onDecrease={cart.decrease}
                      onRemove={cart.remove}
                    />
                    <TotalsBlock totals={totals} currencySymbol={currency} />
                    <button
                      type="button"
                      disabled={!canOrder}
                      onClick={() => setCartOpen(true)}
                      className="w-full rounded-2xl py-3.5 text-sm font-bold text-brand-contrast disabled:opacity-60 shadow-md"
                      style={{ backgroundColor: "var(--brand)" }}
                    >
                      {canOrder ? "Checkout" : "Ordering unavailable"}
                    </button>
                  </>
                )}
              </div>
            </aside>
          </div>
        </>
      )}

      <CartBar
        count={cart.count}
        subtotal={cart.subtotal}
        currencySymbol={currency}
        onOpen={() => setCartOpen(true)}
      />

      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        lines={cart.lines}
        totals={totals}
        currencySymbol={currency}
        tableLabel={tableLabel}
        table={table}
        availableTables={availableTables}
        mode={mode}
        canOrder={canOrder}
        submitting={mutation.isPending}
        errorMessage={
          mutation.isError
            ? mutation.error instanceof Error
              ? mutation.error.message
              : "Unable to place the order."
            : null
        }
        onIncrease={cart.increase}
        onDecrease={cart.decrease}
        onRemove={cart.remove}
        onSubmit={(payload) => mutation.mutate(payload)}
      />

      <VariantModal
        item={variantItem}
        currencySymbol={currency}
        onClose={() => setVariantItem(null)}
        onConfirm={(item, variantId) => {
          const variant = item.variants.find((v) => v.id === variantId);
          if (!variant) return;
          cart.add({
            itemId: item.id,
            variantId: variant.id,
            name: item.name,
            variantName: variant.name,
            unitPrice: variant.price,
            imageUrl: item.image_url,
            foodType: item.food_type,
          });
          setVariantItem(null);
        }}
      />
    </div>
  );
}

function Section({
  id,
  title,
  subtitle,
  refs,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string | null;
  refs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      ref={(el) => {
        refs.current[id] = el;
      }}
      className="scroll-mt-24 pt-2 pb-8"
    >
      <h2 className="text-xl font-extrabold text-foreground">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ItemGrid({
  items,
  currency,
  canOrder,
  cart,
  onAdd,
}: {
  items: MenuItem[];
  currency: string | null;
  canOrder: boolean;
  cart: ReturnType<typeof useCart>;
  onAdd: (item: MenuItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {items.map((item) => (
        <MenuItemCard
          key={item.id}
          item={item}
          currencySymbol={currency}
          canOrder={canOrder}
          quantity={cart.quantityForItem(item.id)}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}
