import { ShoppingBag } from "lucide-react";
import { formatMoney } from "@/lib/format";

interface Props {
  count: number;
  subtotal: number;
  currencySymbol: string | null;
  onOpen: () => void;
}

export function CartBar({ count, subtotal, currencySymbol, onOpen }: Props) {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <button
        type="button"
        onClick={onOpen}
        className="animate-rise flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-brand-contrast shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-transform duration-200 active:scale-[0.98]"
        style={{ backgroundColor: "var(--brand)" }}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingBag className="size-4" />
          {count} {count === 1 ? "item" : "items"}
          <span className="opacity-70">·</span>
          {formatMoney(subtotal, currencySymbol)}
        </span>
        <span className="text-sm font-bold">View cart →</span>
      </button>
    </div>
  );
}