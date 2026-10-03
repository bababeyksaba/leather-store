"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { api, accountMutation } from "../lib/api";

const Context = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const lock = useRef(false);

  async function refresh() {
    const data = await api("cart/");

    setCart(data);
    setError("");

    return data;
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, []);

  async function mutate(path, method, quantity) {
    if (lock.current) {
      throw new Error(
        "لطفاً منتظر پایان درخواست قبلی بمانید."
      );
    }

    lock.current = true;
    setBusy(true);

    try {
      await accountMutation(
        path,
        method,
        quantity === undefined ? undefined : { quantity }
      );

      await refresh();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <Context.Provider
      value={{
        cart,
        error,
        busy,
        refresh,

        add: (id, quantity, variantId) =>
          mutate(variantId ? `cart/variants/${variantId}/` : `cart/items/${id}/`, "POST", quantity),

        update: (id, quantity) =>
          mutate(`cart/variants/${id}/`, "PATCH", quantity),

        remove: (id) =>
          mutate(`cart/variants/${id}/`, "DELETE"),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useCart() {
  const context = useContext(Context);

  if (!context) {
    throw new Error("useCart باید داخل CartProvider باشد.");
  }

  return context;
}
