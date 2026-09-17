import { Clock, Plus, Sparkles, Star } from "lucide-react";
import { FoodTypeDot } from "./FoodTypeDot";
import { formatMoney } from "@/lib/format";
import type { MenuItem } from "@/types/menu";

interface Props {
  item: MenuItem;
  currencySymbol: string | null;
  canOrder: boolean;
  quantity: number;
  onAdd: (item: MenuItem) => void;
}

export function MenuItemCard({ item, currencySymbol, canOrder, quantity, onAdd }: Props) {
  const fromPrice =
    item.has_variant && item.variants.length > 0
      ? Math.min(...item.variants.map((v) => v.price))
      : item.price;

  return (
    <article className="group flex gap-3 rounded-3xl border border-border/70 bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:shadow-[0_8px_28px_rgba(0,0,0,0.07)] sm:gap-4 sm:p-4">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-muted sm:size-28">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-accent to-secondary text-xl font-bold text-muted-foreground">
            {item.name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5">
          <FoodTypeDot type={item.food_type} />
          {item.is_recommended ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-800 uppercase">
              <Star className="size-2.5 fill-current" /> Recommended
            </span>
          ) : null}
          {item.is_featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent-foreground uppercase">
              <Sparkles className="size-2.5" /> Featured
            </span>
          ) : null}
        </div>

        <h3 className="mt-1 truncate text-[15px] font-bold text-foreground">{item.name}</h3>
        {item.description ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-base font-extrabold" style={{ color: "var(--brand)" }}>
              {item.has_variant && item.variants.length > 0 ? (
                <span className="text-[11px] font-semibold text-muted-foreground">From </span>
              ) : null}
              {formatMoney(fromPrice, currencySymbol)}
            </p>
            {item.preparation_time ? (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3" /> {item.preparation_time} min
              </p>
            ) : null}
          </div>

          {canOrder ? (
            <button
              type="button"
              onClick={() => onAdd(item)}
              className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold text-brand-contrast shadow-sm transition-transform duration-150 active:scale-95"
              style={{ backgroundColor: "var(--brand)" }}
            >
              <Plus className="size-4" />
              {quantity > 0 ? `Add · ${quantity}` : "Add"}
            </button>
          ) : (
            <span className="rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </article>
  );
}