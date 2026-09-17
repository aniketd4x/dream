import { AlertTriangle, QrCode, RefreshCw, Utensils } from "lucide-react";

interface Props {
  code: string;
  onRetry?: () => void;
}

const COPY: Record<string, { title: string; body: string; icon: "qr" | "warn" | "menu" }> = {
  INVALID_QR: {
    title: "Invalid QR Code",
    body: "This table QR code is not valid.",
    icon: "qr",
  },
  TABLE_INACTIVE: {
    title: "Table unavailable",
    body: "This table is currently unavailable.",
    icon: "warn",
  },
  RESTAURANT_INACTIVE: {
    title: "Restaurant unavailable",
    body: "This restaurant is currently unavailable.",
    icon: "warn",
  },
  EMPTY_MENU: {
    title: "Menu coming soon",
    body: "This restaurant hasn't added any menu items yet.",
    icon: "menu",
  },
  NETWORK: {
    title: "Unable to load the menu",
    body: "Something went wrong while loading. Please try again.",
    icon: "warn",
  },
  ORDER_NOT_FOUND: {
    title: "Order not found",
    body: "We couldn't find this order. Please check with the restaurant staff.",
    icon: "warn",
  },
};

export function MenuErrorState({ code, onRetry }: Props) {
  const copy = COPY[code] ?? COPY["NETWORK"]!;
  const Icon = copy.icon === "qr" ? QrCode : copy.icon === "menu" ? Utensils : AlertTriangle;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="animate-rise w-full max-w-sm rounded-3xl border border-border/70 bg-card p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <h1 className="mt-5 text-xl font-extrabold">{copy.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-brand-contrast"
            style={{ backgroundColor: "var(--brand)" }}
          >
            <RefreshCw className="size-4" /> Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}