import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CartLines, TotalsBlock, type Totals } from "./CartSummary";
import { Loader2, ShoppingBag } from "lucide-react";
import type { CartLine, DiningTable, OrderType } from "@/types/menu";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: CartLine[];
  totals: Totals;
  currencySymbol: string | null;
  tableLabel?: string;
  table?: DiningTable | null;
  availableTables?: DiningTable[];
  mode?: "table" | "direct" | "room";
  canOrder: boolean;
  submitting: boolean;
  errorMessage: string | null;
  onIncrease: (key: string) => void;
  onDecrease: (key: string) => void;
  onRemove: (key: string) => void;
  onSubmit: (payload: {
    name: string;
    mobile: string;
    notes: string;
    orderType: OrderType;
    tableNumber?: string | null;
    diningTableId?: string | null;
  }) => void;
}

export function CartDrawer(props: Props) {
  const {
    open,
    onOpenChange,
    lines,
    totals,
    currencySymbol,
    tableLabel,
    table,
    availableTables = [],
    mode = table ? "table" : "direct",
    canOrder,
    submitting,
    errorMessage,
  } = props;

  const [name, setName] = useState(() => {
    try {
      return window.localStorage.getItem("dishgaze_customer_name") || "";
    } catch {
      return "";
    }
  });

  const [mobile, setMobile] = useState(() => {
    try {
      return window.localStorage.getItem("dishgaze_customer_mobile") || "";
    } catch {
      return "";
    }
  });

  const [notes, setNotes] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [customTableNumber, setCustomTableNumber] = useState<string>("");
  const [touched, setTouched] = useState(false);

  // Reset form errors when drawer opens
  useEffect(() => {
    if (open) {
      setTouched(false);
    }
  }, [open]);

  const nameValid = name.trim().length > 0;
  const mobileValid = mobile.replace(/[^0-9]/g, "").length >= 7;
  const effectiveTableNumber =
    mode === "table"
      ? table?.table_number ?? table?.table_name ?? ""
      : selectedTableId
      ? availableTables.find((t) => t.id === selectedTableId)?.table_number ?? ""
      : customTableNumber.trim();

  const tableValid =
    mode === "table" || mode === "room" || availableTables.length === 0 || effectiveTableNumber.trim().length > 0;

  const handleSubmit = () => {
    setTouched(true);
    if (!nameValid || !mobileValid || !tableValid) return;

    try {
      window.localStorage.setItem("dishgaze_customer_name", name.trim());
      window.localStorage.setItem("dishgaze_customer_mobile", mobile.trim());
    } catch {
      /* ignore storage write error */
    }

    const finalTableNumber = effectiveTableNumber || null;
    const finalTableId =
      mode === "table" ? table?.id ?? null : selectedTableId || null;

    props.onSubmit({
      name: name.trim(),
      mobile: mobile.trim(),
      notes: notes.trim(),
      orderType: (mode === "room" ? "ROOM_SERVICE" : "dine_in") as OrderType,
      tableNumber: finalTableNumber,
      diningTableId: finalTableId,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl p-0">
        <SheetHeader className="px-5 pt-5 pb-2">
          <SheetTitle className="text-left text-xl font-extrabold">Your order</SheetTitle>
          <p className="text-left text-sm text-muted-foreground">
            {mode === "table" && table
              ? `Table ${table.table_number ?? table.table_name ?? "—"}`
              : tableLabel || (mode === "room" ? "Hotel Room Service" : "Storefront / Direct Menu")}
          </p>
        </SheetHeader>

        <div className="space-y-5 px-5 pb-8">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
                <ShoppingBag className="size-7 text-muted-foreground" />
              </div>
              <p className="font-bold">Your cart is empty</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Browse the menu and add something delicious.
              </p>
            </div>
          ) : (
            <>
              <CartLines
                lines={lines}
                currencySymbol={currencySymbol}
                onIncrease={props.onIncrease}
                onDecrease={props.onDecrease}
                onRemove={props.onRemove}
              />
              <TotalsBlock totals={totals} currencySymbol={currencySymbol} />

              {canOrder ? (
                <div className="space-y-4">
                  {/* Hotel Room Delivery Banner */}
                  {(mode === "room" || (table?.table_number && /^room/i.test(table.table_number.trim()))) && (
                    <div className="flex items-center gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-amber-900 dark:text-amber-200">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-lg font-bold">
                        🏨
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          In-Room Dining
                        </div>
                        <div className="text-sm font-black">
                          Delivering to {table?.table_number?.replace(/^room\s*/i, 'Room ') || 'your Room'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Table Selection for Direct visits when tables exist */}
                  {mode === "direct" && availableTables.length > 0 && (
                    <div className="rounded-2xl border border-border/80 bg-secondary/40 p-3.5 space-y-3">
                      <div>
                        <label className="text-xs font-bold text-foreground" htmlFor="table-num">
                          Select Table Number (optional)
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Enter your Table Number or select from available tables
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {availableTables.map((tbl) => (
                          <button
                            key={tbl.id}
                            type="button"
                            onClick={() => {
                              setSelectedTableId(tbl.id);
                              setCustomTableNumber(tbl.table_number ?? "");
                            }}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                              selectedTableId === tbl.id
                                ? "text-brand-contrast shadow-sm"
                                : "border border-border bg-card text-foreground hover:bg-secondary"
                            }`}
                            style={selectedTableId === tbl.id ? { backgroundColor: "var(--brand)" } : undefined}
                          >
                            Table {tbl.table_number ?? tbl.table_name}
                          </button>
                        ))}
                      </div>

                      <div>
                        <input
                          id="table-num"
                          value={customTableNumber}
                          maxLength={30}
                          onChange={(e) => {
                            setCustomTableNumber(e.target.value);
                            setSelectedTableId("");
                          }}
                          placeholder="Or type Table Number (e.g. 5, T-12)"
                          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="cust-name">
                      Customer Name *
                    </label>
                    <input
                      id="cust-name"
                      value={name}
                      maxLength={80}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aarav"
                      className={`mt-1 w-full rounded-xl border bg-card px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring ${
                        touched && !nameValid ? "border-destructive" : "border-border"
                      }`}
                      disabled={submitting}
                    />
                    {touched && !nameValid && (
                      <p className="mt-1 text-xs text-destructive">Please enter your name</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="cust-mobile">
                      Mobile Number *
                    </label>
                    <input
                      id="cust-mobile"
                      value={mobile}
                      maxLength={20}
                      inputMode="tel"
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className={`mt-1 w-full rounded-xl border bg-card px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring ${
                        touched && !mobileValid ? "border-destructive" : "border-border"
                      }`}
                      disabled={submitting}
                    />
                    {touched && !mobileValid && (
                      <p className="mt-1 text-xs text-destructive">Please enter a valid mobile number</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="cust-notes">
                      Special Cooking Notes (optional)
                    </label>
                    <textarea
                      id="cust-notes"
                      value={notes}
                      maxLength={500}
                      rows={2}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Less spicy, no onion, extra napkins…"
                      className="mt-1 w-full resize-none rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      disabled={submitting}
                    />
                  </div>

                  {errorMessage && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-brand-contrast transition-opacity hover:opacity-90 disabled:opacity-60 shadow-lg"
                    style={{ backgroundColor: "var(--brand)" }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Placing order...
                      </>
                    ) : (
                      "Place Order"
                    )}
                  </button>
                </div>
              ) : (
                <p className="rounded-2xl bg-secondary p-4 text-center text-sm font-semibold text-muted-foreground">
                  Ordering is currently unavailable.
                </p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}