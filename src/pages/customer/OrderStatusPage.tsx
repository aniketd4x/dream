import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChefHat,
  ConciergeBell,
  Loader2,
  PartyPopper,
  Plus,
  Receipt,
  Sparkles,
  UtensilsCrossed,
  XCircle,
  AlertCircle,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { loadMultipleOrderStatuses } from "@/lib/menuService";
import { formatMoney } from "@/lib/format";
import { FoodTypeDot } from "@/components/menu/FoodTypeDot";
import { MenuErrorState } from "@/components/menu/MenuErrorState";
import type { OrderStatusCode, OrderStatusPayload } from "@/types/menu";

const STEPS: { code: OrderStatusCode; label: string; hint: string; icon: typeof ChefHat }[] = [
  { code: "pending", label: "Order placed", hint: "We've received your order", icon: Receipt },
  { code: "confirmed", label: "Confirmed", hint: "The restaurant accepted it", icon: Check },
  { code: "preparing", label: "Preparing", hint: "Your food is being cooked", icon: ChefHat },
  { code: "ready", label: "Ready", hint: "Freshly plated and ready", icon: ConciergeBell },
  { code: "served", label: "Served", hint: "Enjoy your meal!", icon: PartyPopper },
];

const PREP_TARGET_MINUTES = 15;

function stepIndex(status: OrderStatusCode) {
  if (status === "completed") return STEPS.length - 1;
  const i = STEPS.findIndex((s) => s.code === status);
  return i < 0 ? 0 : i;
}

function normalizeColor(value: string | null) {
  const v = (value ?? "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : "#16A34A";
}

function getPrepTimerInfo(createdAtStr: string | null) {
  if (!createdAtStr) return { remainingSec: 900, isDelayed: false, delaySec: 0 };
  const created = new Date(createdAtStr).getTime();
  const elapsedSec = Math.floor((Date.now() - created) / 1000);
  const targetSec = PREP_TARGET_MINUTES * 60;
  const remainingSec = targetSec - elapsedSec;

  if (remainingSec >= 0) {
    return { remainingSec, isDelayed: false, delaySec: 0 };
  } else {
    return { remainingSec: 0, isDelayed: true, delaySec: Math.abs(remainingSec) };
  }
}

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function OrderStatusPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const [lastQrToken, setLastQrToken] = useState<string | null>(null);
  const [sessionOrders, setSessionOrders] = useState<Array<{ id: string; number: string }>>([]);
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [, setNowTick] = useState<number>(Date.now());

  useEffect(() => {
    try {
      const storedToken = window.localStorage.getItem("dishgaze-last-qr-token");
      if (storedToken) {
        setLastQrToken(storedToken);
        const rawHistory = window.localStorage.getItem(`qr-orders-history:${storedToken}`);
        if (rawHistory) {
          const list = JSON.parse(rawHistory) as Array<{ id: string; number: string }>;
          if (Array.isArray(list) && list.length > 0) {
            setSessionOrders(list);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // 1-second interval ticker for prep timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const orderIdsToFetch = useMemo(() => {
    const ids = new Set([orderId]);
    sessionOrders.forEach((o) => ids.add(o.id));
    return Array.from(ids).filter(Boolean);
  }, [orderId, sessionOrders]);

  const query = useQuery({
    queryKey: ["multi-orders-status", orderIdsToFetch.join(",")],
    queryFn: () => loadMultipleOrderStatuses(orderIdsToFetch),
    refetchInterval: 6_000,
    retry: 1,
    refetchOnWindowFocus: true,
    enabled: orderIdsToFetch.length > 0,
  });

  const orders = query.data ?? [];
  const primaryOrder = orders.find((o) => o.id === orderId) ?? orders[0];

  useEffect(() => {
    if (orders.length > 0) {
      const isFinished = orders.every((o) => o.status === "completed" || o.status === "cancelled");
      if (isFinished && lastQrToken) {
        try {
          window.localStorage.removeItem(`qr-last-order:${lastQrToken}`);
          window.localStorage.removeItem(`qr-orders-history:${lastQrToken}`);
        } catch {
          /* ignore */
        }
      }
    }
  }, [orders, lastQrToken]);

  if (query.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.isError || !primaryOrder) {
    const message = query.error instanceof Error ? query.error.message : "";
    const code = /ORDER_NOT_FOUND|couldn't find that order/i.test(message)
      ? "ORDER_NOT_FOUND"
      : "NETWORK";
    return <MenuErrorState code={code} onRetry={() => void query.refetch()} />;
  }

  const brand = normalizeColor(primaryOrder.brandColor);
  const currencySymbol = primaryOrder.currencySymbol;
  const isCompletedMeal = orders.length > 0 && orders.every((o) => o.status === "completed");

  const prepTimerInfo = getPrepTimerInfo(primaryOrder.createdAt);
  const isPreparingOrActive =
    primaryOrder.status === "pending" ||
    primaryOrder.status === "confirmed" ||
    primaryOrder.status === "preparing";

  const combinedSubtotal = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const combinedTax = orders.reduce((sum, o) => sum + o.taxAmount, 0);
  const combinedDiscount = orders.reduce((sum, o) => sum + o.discountAmount, 0);
  const combinedGrandTotal = orders.reduce((sum, o) => sum + o.grandTotal, 0);

  const displayedOrders = selectedTab === "all" ? orders : orders.filter((o) => o.id === selectedTab);

  const allPaidInDb = orders.every((o) => (o.paymentStatus ?? "").toLowerCase() === "paid");
  const anyPartiallyPaidInDb = orders.some((o) => (o.paymentStatus ?? "").toLowerCase() === "partially_paid");

  return (
    <div
      className="min-h-screen bg-background pb-14"
      style={{ ["--brand" as string]: brand } as React.CSSProperties}
    >
      {/* Header Navigation */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3.5 sm:px-6">
          {lastQrToken ? (
            <Link
              to={`/menu/${lastQrToken}`}
              className="inline-flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-accent"
              aria-label="Back to Menu"
            >
              <ArrowLeft className="size-4" />
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-accent"
              aria-label="Back to Home"
            >
              <ArrowLeft className="size-4" />
            </Link>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{primaryOrder.restaurantName}</p>
            <p className="text-xs text-muted-foreground">
              {orders.length > 1
                ? `${primaryOrder.tableNumber ? `Table ${primaryOrder.tableNumber} · ` : ""}${orders.length} Orders Placed`
                : `Order #${primaryOrder.orderNumber} ${
                    primaryOrder.orderType === "takeaway"
                      ? "· 🛵 Takeaway"
                      : primaryOrder.orderType === "counter"
                      ? "· 🛍️ Counter"
                      : primaryOrder.tableNumber
                      ? `· Table ${primaryOrder.tableNumber}`
                      : ""
                  }`}
            </p>
          </div>

          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            <span className="relative flex size-1.5">
              <span
                className="absolute inline-flex size-full animate-ping rounded-full opacity-70"
                style={{ backgroundColor: isCompletedMeal ? "hsl(142 76% 36%)" : brand }}
              />
              <span
                className="relative inline-flex size-1.5 rounded-full"
                style={{ backgroundColor: isCompletedMeal ? "hsl(142 76% 36%)" : brand }}
              />
            </span>
            {isCompletedMeal ? "Completed" : "Live"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
        {/* Completed Meal Screen */}
        {isCompletedMeal ? (
          <section className="animate-rise rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-50/50 to-card dark:from-emerald-950/20 p-7 text-center shadow-lg">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
              <PartyPopper className="size-8" />
            </div>
            <h1 className="mt-5 text-2xl font-black text-foreground">Meal Completed!</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Thank you for dining with us at {primaryOrder.restaurantName}. Your orders have been served!
            </p>

            <div className="mt-6 space-y-3 rounded-2xl bg-secondary/80 p-4 text-center">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Total Table Amount
              </p>
              <p className="text-3xl font-black" style={{ color: "var(--brand)" }}>
                {formatMoney(combinedGrandTotal, currencySymbol)}
              </p>

              <div className="pt-2">
                {allPaidInDb ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3.5 py-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" /> Paid in Full
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3.5 py-1.5 text-xs font-extrabold text-amber-700 dark:text-amber-300">
                    <CreditCard className="size-4" /> Payment Due at Counter / Table
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          /* Active Order Live Tracker */
          <section className="animate-rise space-y-4 rounded-3xl border border-border/70 bg-card p-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.05)]">
            {primaryOrder.status === "cancelled" ? (
              <>
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <XCircle className="size-7" />
                </div>
                <h1 className="mt-4 text-xl font-extrabold">Order cancelled</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  This order was cancelled. You can place a new order anytime.
                </p>
              </>
            ) : (
              <>
                <div
                  className="mx-auto flex size-14 items-center justify-center rounded-full text-brand-contrast"
                  style={{ backgroundColor: brand }}
                >
                  {(() => {
                    const active = stepIndex(primaryOrder.status);
                    const Icon = STEPS[active]!.icon;
                    return <Icon className="size-7" />;
                  })()}
                </div>
                <h1 className="mt-4 text-xl font-extrabold">
                  {STEPS[stepIndex(primaryOrder.status)]!.label}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {STEPS[stepIndex(primaryOrder.status)]!.hint}
                </p>
              </>
            )}

            {/* 15-MIN PREPARATION TIMER */}
            {isPreparingOrActive && (
              <div className="mt-2">
                {!prepTimerInfo.isDelayed ? (
                  <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-950 dark:text-emerald-200">
                    <div className="flex items-center gap-3 text-left">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-sm">
                        <ChefHat className="size-5" />
                      </span>
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                          Estimated Prep Time (15 Mins)
                        </p>
                        <p className="text-sm font-extrabold">
                          Preparing dishes:{" "}
                          <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                            {formatCountdown(prepTimerInfo.remainingSec)}
                          </span>{" "}
                          remaining
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive dark:text-red-400">
                    <div className="flex items-center gap-3 text-left">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground font-bold shadow-sm animate-pulse">
                        <AlertCircle className="size-5" />
                      </span>
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-wide text-destructive">
                          Order Delayed
                        </p>
                        <p className="text-sm font-extrabold">
                          Delayed by{" "}
                          <span className="font-mono text-base font-black text-destructive">
                            + {formatCountdown(prepTimerInfo.delaySec)}
                          </span>
                        </p>
                        <p className="text-[11px] opacity-80">
                          Kitchen is taking a bit longer to plate your dishes perfectly.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Payment & Bill Status */}
        <section className="rounded-3xl border border-border/70 bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <CreditCard className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-black text-foreground">Payment & Bill Status</h2>
                <p className="text-xs text-muted-foreground">Live bill overview</p>
              </div>
            </div>

            {allPaidInDb ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" /> Paid
              </span>
            ) : anyPartiallyPaidInDb ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-extrabold text-blue-600 dark:text-blue-400">
                Partially Paid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-extrabold text-amber-700 dark:text-amber-300">
                Payment Due
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="font-semibold text-muted-foreground">Total Bill Due</span>
            <span className="text-xl font-black text-foreground" style={{ color: "var(--brand)" }}>
              {formatMoney(combinedGrandTotal, currencySymbol)}
            </span>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {!allPaidInDb
              ? "Please pay your total bill amount at the cashier counter or to your table server."
              : "Payment confirmed by restaurant."}
          </p>
        </section>

        {/* Multi-Order History */}
        {orders.length > 1 && (
          <div className="space-y-2">
            <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Table Orders History ({orders.length} Rounds)
            </p>
            <div className="flex gap-2 overflow-x-auto py-1">
              <button
                type="button"
                onClick={() => setSelectedTab("all")}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  selectedTab === "all"
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                All Orders ({orders.length})
              </button>
              {orders.map((ord, idx) => (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => setSelectedTab(ord.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                    selectedTab === ord.id
                      ? "text-brand-contrast shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                  style={selectedTab === ord.id ? { backgroundColor: "var(--brand)" } : undefined}
                >
                  <span>Order #{ord.orderNumber}</span>
                  {idx > 0 && <span className="text-[10px] opacity-75">(Added Later)</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stepper for Single Order */}
        {displayedOrders.length === 1 && displayedOrders[0]?.status !== "cancelled" && !isCompletedMeal ? (
          <section className="rounded-3xl border border-border/70 bg-card p-5">
            <ol className="relative space-y-6">
              {STEPS.map((step, i) => {
                const activeIndex = stepIndex(displayedOrders[0]!.status);
                const done = i <= activeIndex;
                const current = i === activeIndex;
                return (
                  <li key={step.code} className="relative flex gap-4">
                    {i < STEPS.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute top-9 left-[17px] h-[calc(100%+4px)] w-0.5 rounded-full"
                        style={{ backgroundColor: i < activeIndex ? brand : "var(--border)" }}
                      />
                    ) : null}
                    <span
                      className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                        done
                          ? "border-transparent text-brand-contrast"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                      style={done ? { backgroundColor: brand } : undefined}
                    >
                      {done ? <Check className="size-4" strokeWidth={3} /> : <step.icon className="size-4" />}
                    </span>
                    <div className="pt-1">
                      <p className={`text-sm font-bold ${current ? "" : done ? "" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.hint}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        {/* Itemized Order List */}
        {displayedOrders.map((ord, idx) => {
          const isOrdPaid = (ord.paymentStatus ?? "").toLowerCase() === "paid";
          return (
            <section key={ord.id} className="space-y-3 rounded-3xl border border-border/70 bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-extrabold">Order #{ord.orderNumber}</h2>
                    {ord.orderType === "takeaway" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        🛵 Takeaway
                      </span>
                    )}
                    {ord.orderType === "counter" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        🛍️ Counter
                      </span>
                    )}
                    {ord.tableNumber && ord.orderType !== "takeaway" && ord.orderType !== "counter" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        Table {ord.tableNumber}
                      </span>
                    )}
                    {idx > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase text-brand">
                        <Sparkles className="size-2.5" /> Added Later
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ord.createdAt
                      ? new Date(ord.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Just now"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-bold capitalize text-foreground">
                    {ord.status}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${
                      isOrdPaid
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {isOrdPaid ? "Paid" : "Due"}
                  </span>
                </div>
              </div>

              <ul className="divide-y divide-border/70">
                {ord.lines.map((line) => (
                  <li key={line.id} className="flex items-start gap-3 py-2.5">
                    <FoodTypeDot type={line.food_type} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{line.item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.quantity} × {formatMoney(line.unit_price, currencySymbol)}
                      </p>
                    </div>
                    <span className="text-sm font-bold">
                      {formatMoney(line.total_price, currencySymbol)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="space-y-1 border-t border-border/70 pt-3 text-sm">
                <Row label="Subtotal" value={formatMoney(ord.subtotal, currencySymbol)} />
                {ord.taxAmount > 0 && <Row label="Taxes & charges" value={formatMoney(ord.taxAmount, currencySymbol)} />}
                {ord.discountAmount > 0 && <Row label="Discount" value={`- ${formatMoney(ord.discountAmount, currencySymbol)}`} />}
                <div className="flex items-center justify-between pt-1 text-sm font-extrabold">
                  <span>Order Total</span>
                  <span>{formatMoney(ord.grandTotal, currencySymbol)}</span>
                </div>
              </dl>
            </section>
          );
        })}

        {/* Combined Session Total */}
        {orders.length > 1 && selectedTab === "all" && (
          <section className="rounded-3xl border-2 border-brand/40 bg-card p-5 shadow-sm">
            <h2 className="text-sm font-extrabold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
              Combined Table Session Summary
            </h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row
                label="Total Items Ordered"
                value={`${orders.reduce(
                  (cnt, o) => cnt + o.lines.reduce((lcnt, line) => lcnt + line.quantity, 0),
                  0
                )} items across ${orders.length} orders`}
              />
              <Row label="Combined Subtotal" value={formatMoney(combinedSubtotal, currencySymbol)} />
              {combinedTax > 0 && <Row label="Combined Taxes & Charges" value={formatMoney(combinedTax, currencySymbol)} />}
              {combinedDiscount > 0 && <Row label="Combined Discount" value={`- ${formatMoney(combinedDiscount, currencySymbol)}`} />}
              <div className="flex items-center justify-between border-t border-border/70 pt-2 text-lg font-black">
                <span>Combined Table Total</span>
                <span style={{ color: "var(--brand)" }}>{formatMoney(combinedGrandTotal, currencySymbol)}</span>
              </div>
            </dl>
          </section>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          {lastQrToken ? (
            <>
              <Link
                to={`/menu/${lastQrToken}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-brand-contrast shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99]"
                style={{ backgroundColor: brand }}
              >
                <Plus className="size-4" strokeWidth={3} />
                {isCompletedMeal ? "Start New Order for Table" : "+ Add More Items to Table Order"}
              </Link>
              <Link
                to={`/menu/${lastQrToken}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
              >
                <UtensilsCrossed className="size-4 text-muted-foreground" />
                Back to Table Menu
              </Link>
            </>
          ) : (
            <Link
              to="/"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
            >
              Go to Home Page
            </Link>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          This page updates automatically every 6 seconds from the database.
        </p>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}
