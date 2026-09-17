import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import type { MenuItem } from "@/types/menu";

interface Props {
  item: MenuItem | null;
  currencySymbol: string | null;
  onClose: () => void;
  onConfirm: (item: MenuItem, variantId: string) => void;
}

export function VariantModal({ item, currencySymbol, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!item) {
      setSelected(null);
      return;
    }
    const def = item.variants.find((v) => v.is_default) ?? item.variants[0];
    setSelected(def ? def.id : null);
  }, [item]);

  return (
    <Dialog open={!!item} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-left text-lg font-extrabold">{item?.name}</DialogTitle>
        </DialogHeader>

        <p className="-mt-1 text-sm text-muted-foreground">Choose an option</p>

        <div className="mt-2 space-y-2">
          {item?.variants.map((variant) => {
            const active = selected === variant.id;
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelected(variant.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                  active ? "border-transparent bg-accent" : "border-border bg-card hover:bg-secondary"
                }`}
                style={active ? { outline: "2px solid var(--brand)" } : undefined}
              >
                <span className="flex items-center gap-3">
                  <span
                    className="flex size-4 items-center justify-center rounded-full border-2"
                    style={{ borderColor: active ? "var(--brand)" : "var(--color-border)" }}
                  >
                    {active ? (
                      <span className="size-2 rounded-full" style={{ backgroundColor: "var(--brand)" }} />
                    ) : null}
                  </span>
                  <span className="text-sm font-semibold">{variant.name}</span>
                </span>
                <span className="text-sm font-bold">{formatMoney(variant.price, currencySymbol)}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!selected || !item}
          onClick={() => item && selected && onConfirm(item, selected)}
          className="mt-4 w-full rounded-2xl py-3.5 text-sm font-bold text-brand-contrast disabled:opacity-50"
          style={{ backgroundColor: "var(--brand)" }}
        >
          Add to cart
        </button>
      </DialogContent>
    </Dialog>
  );
}