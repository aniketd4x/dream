import { Minus, Plus, Trash2 } from "lucide-react";
import { FoodTypeDot } from "./FoodTypeDot";
import { formatMoney } from "@/lib/format";
import type { CartLine } from "@/types/menu";

export interface Totals {
  subtotal: number;
  gst: number;
  service: number;
  grandTotal: number;
  gstPercent: number;
  servicePercent: number;
}

export function computeTotals(
  subtotal: number,
  gstPercent: number | null | undefined,
  servicePercent: number | null | undefined,
): Totals {
  const g = Number(gstPercent ?? 0);
  const s = Number(servicePercent ?? 0);
  const round = (n: number) => Math.round(n * 100) / 100;
  const gst = round((subtotal * g) / 100);
  const service = round((subtotal * s) / 100);
  return {
    subtotal: round(subtotal),
    gst,
    service,
    grandTotal: round(subtotal + gst + service),
    gstPercent: g,
    servicePercent: s,
  };
}

interface LinesProps {
  lines: CartLine[];
  currencySymbol: string | null;
  onIncrease: (key: string) => void;
  onDecrease: (key: string) => void;
  onRemove: (key: string) => void;
}

export function CartLines({ lines, currencySymbol, onIncrease, onDecrease, onRemove }: LinesProps) {
  return (
    <ul className="space-y-3">
      {lines.map((line) => (
        <li key={line.key} className="flex gap-3 rounded-2xl border border-border/70 bg-card p-3">
          <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            {line.imageUrl ? (
              <img src={line.imageUrl} alt={line.name} loading="lazy" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-sm font-bold text-muted-foreground">
                {line.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                  <FoodTypeDot type={line.foodType} />
                  {line.name}
                </p>
                {line.variantName ? (
                  <p className="text-xs text-muted-foreground">{line.variantName}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label={`Remove ${line.name}`}
                onClick={() => onRemove(line.key)}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="inline-flex items-center gap-3 rounded-full border border-border bg-secondary px-2 py-1">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => onDecrease(line.key)}
                  className="text-foreground"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-4 text-center text-sm font-bold">{line.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => onIncrease(line.key)}
                  style={{ color: "var(--brand)" }}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <span className="text-sm font-extrabold">
                {formatMoney(line.unitPrice * line.quantity, currencySymbol)}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TotalsBlock({
  totals,
  currencySymbol,
}: {
  totals: Totals;
  currencySymbol: string | null;
}) {
  return (
    <div className="space-y-2 rounded-2xl bg-secondary/70 p-4 text-sm">
      <Row label="Subtotal" value={formatMoney(totals.subtotal, currencySymbol)} />
      {totals.gstPercent > 0 ? (
        <Row label={`GST (${totals.gstPercent}%)`} value={formatMoney(totals.gst, currencySymbol)} />
      ) : null}
      {totals.servicePercent > 0 ? (
        <Row
          label={`Service charge (${totals.servicePercent}%)`}
          value={formatMoney(totals.service, currencySymbol)}
        />
      ) : null}
      <div className="mt-1 border-t border-border pt-2">
        <div className="flex items-center justify-between">
          <span className="text-base font-extrabold">Total</span>
          <span className="text-base font-extrabold" style={{ color: "var(--brand)" }}>
            {formatMoney(totals.grandTotal, currencySymbol)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}