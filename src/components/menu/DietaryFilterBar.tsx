import { FoodTypeDot } from "./FoodTypeDot";

export type DietaryFilter = "all" | "veg" | "nonveg" | "vegan" | "egg";

interface Props {
  selected: DietaryFilter;
  onChange: (filter: DietaryFilter) => void;
  counts?: {
    all: number;
    veg: number;
    nonveg: number;
    vegan?: number;
    egg: number;
  };
}

export function DietaryFilterBar({ selected, onChange, counts }: Props) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-bold transition-all ${
          selected === "all"
            ? "bg-foreground text-background shadow-sm"
            : "bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <span>All</span>
        {counts ? <span className="opacity-75 text-[10px]">({counts.all})</span> : null}
      </button>

      <button
        type="button"
        onClick={() => onChange("veg")}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-bold transition-all ${
          selected === "veg"
            ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30"
            : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
        }`}
      >
        <FoodTypeDot type="veg" />
        <span>Veg</span>
        {counts && counts.veg > 0 ? (
          <span className="opacity-75 text-[10px]">({counts.veg})</span>
        ) : null}
      </button>

      {counts && counts.vegan && counts.vegan > 0 ? (
        <button
          type="button"
          onClick={() => onChange("vegan")}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-bold transition-all ${
            selected === "vegan"
              ? "bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/30"
              : "bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 hover:bg-teal-100"
          }`}
        >
          <FoodTypeDot type="vegan" />
          <span>Vegan</span>
          <span className="opacity-75 text-[10px]">({counts.vegan})</span>
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onChange("nonveg")}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-bold transition-all ${
          selected === "nonveg"
            ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30"
            : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100"
        }`}
      >
        <FoodTypeDot type="nonveg" />
        <span>Non-Veg</span>
        {counts && counts.nonveg > 0 ? (
          <span className="opacity-75 text-[10px]">({counts.nonveg})</span>
        ) : null}
      </button>

      {counts && counts.egg > 0 ? (
        <button
          type="button"
          onClick={() => onChange("egg")}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-bold transition-all ${
            selected === "egg"
              ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30"
              : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100"
          }`}
        >
          <FoodTypeDot type="egg" />
          <span>Egg</span>
          <span className="opacity-75 text-[10px]">({counts.egg})</span>
        </button>
      ) : null}
    </div>
  );
}
