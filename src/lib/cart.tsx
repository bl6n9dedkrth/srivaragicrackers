import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = { rowId: string; slug: string; name: string; price: number; image: string; quantity: number };

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (rowId: string, quantity: number) => void;
  remove: (rowId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "svc-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

const clampQty = (value: number) => Math.max(1, Math.min(99, Math.floor(Number.isFinite(value) ? value : 1)));

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed as CartItem[]);
      }
    } catch {
      /* ignore malformed cart */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items, hydrated]);

  const add = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((entry) => entry.rowId === item.rowId);
      if (existing) return prev.map((entry) => (entry.rowId === item.rowId ? { ...entry, quantity: clampQty(entry.quantity + quantity) } : entry));
      return [...prev, { ...item, quantity: clampQty(quantity) }];
    });
  }, []);

  const setQuantity = useCallback((rowId: string, quantity: number) => {
    setItems((prev) => (quantity < 1 ? prev.filter((entry) => entry.rowId !== rowId) : prev.map((entry) => (entry.rowId === rowId ? { ...entry, quantity: clampQty(quantity) } : entry))));
  }, []);

  const remove = useCallback((rowId: string) => setItems((prev) => prev.filter((entry) => entry.rowId !== rowId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
    add,
    setQuantity,
    remove,
    clear,
  }), [items, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
