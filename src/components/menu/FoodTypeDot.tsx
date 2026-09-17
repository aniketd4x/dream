export function FoodTypeDot({ type }: { type: string | null }) {
  const normalized = (type ?? "").toLowerCase().replace(/[\s_-]/g, "");
  let color = "border-muted-foreground/50";
  let dot = "bg-muted-foreground/60";
  let label = type ?? "Item";

  if (normalized === "vegan") {
    color = "border-emerald-600";
    dot = "bg-emerald-600";
    label = "Vegan";
  } else if (normalized === "veg" || normalized === "vegetarian") {
    color = "border-veg";
    dot = "bg-veg";
    label = "Veg";
  } else if (normalized === "nonveg" || normalized === "nonvegetarian" || normalized === "nonveg") {
    color = "border-nonveg";
    dot = "bg-nonveg";
    label = "Non-veg";
  } else if (normalized === "egg") {
    color = "border-amber-500";
    dot = "bg-amber-500";
    label = "Egg";
  } else if (!type) {
    return null;
  }

  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] ${color}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} />
    </span>
  );
}