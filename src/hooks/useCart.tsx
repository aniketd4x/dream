import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { CartLine } from "@/types/menu";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "key" | "quantity">, quantity?: number) => void;
  increase: (key: string) => void;
  decrease: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  quantityForItem: (itemId: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

const makeKey = (itemId: string, variantId: string | null) => `${itemId}::${variantId ?? "base"}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const add = useCallback((line: Omit<CartLine, "key" | "quantity">, quantity = 1) => {
    const key = makeKey(line.itemId, line.variantId);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...prev, { ...line, key, quantity }];
    });
  }, []);

  const increase = useCallback((key: string) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l)));
  }, []);

  const decrease = useCallback((key: string) => {
    setLines((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    return {
      lines,
      count,
      subtotal: Math.round(subtotal * 100) / 100,
      add,
      increase,
      decrease,
      remove,
      clear,
      quantityForItem: (itemId: string) =>
        lines.filter((l) => l.itemId === itemId).reduce((s, l) => s + l.quantity, 0),
    };
  }, [lines, add, increase, decrease, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}