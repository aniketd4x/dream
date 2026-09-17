import { Check, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { formatMoney } from "@/lib/format";
import type { PlacedOrder } from "@/types/menu";

interface Props {
  order: PlacedOrder;
  currencySymbol: string | null;
  onBackToMenu: () => void;
}

export function OrderSuccess({ order, currencySymbol, onBackToMenu }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="animate-rise w-full max-w-sm rounded-3xl border border-border/70 bg-card p-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div
          className="mx-auto flex size-16 items-center justify-center rounded-full text-brand-contrast"
          style={{ backgroundColor: "var(--brand)" }}
        >
          <Check className="size-8" strokeWidth={3} />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold">Order placed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Thank you! Our kitchen is on it.
        </p>

        <div className="mt-6 space-y-2 rounded-2xl bg-secondary/70 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Order</span>
            <span className="font-extrabold">#{order.orderNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-semibold capitalize">
              {order.orderType === "takeaway"
                ? "🛵 Takeaway / Pickup"
                : order.orderType === "counter"
                ? "🛍️ Counter Order"
                : order.tableNumber
                ? `🍽️ Dine-In (Table ${order.tableNumber})`
                : "🍽️ Dine-In"}
            </span>
          </div>
          {order.tableNumber && order.orderType !== "takeaway" && order.orderType !== "counter" ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Table</span>
              <span className="font-semibold">{order.tableNumber}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{formatMoney(order.grandTotal, currencySymbol)}</span>
          </div>
        </div>

        <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-4" />
          Estimated prep time:{" "}
          {order.prepTime ? `${order.prepTime}–${order.prepTime + 10} minutes` : "15–25 minutes"}
        </p>

        <Link
          to={`/order/${order.orderId}`}
          className="mt-6 block w-full rounded-2xl py-3.5 text-sm font-bold text-brand-contrast"
          style={{ backgroundColor: "var(--brand)" }}
        >
          Track my order
        </Link>

        <button
          type="button"
          onClick={onBackToMenu}
          className="mt-2.5 w-full rounded-2xl border border-border bg-card py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
        >
          Back to menu
        </button>
      </div>
    </div>
  );
}