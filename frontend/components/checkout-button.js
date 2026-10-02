"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "../lib/api";
import { useAuth } from "./auth-context";

export default function CheckoutButton({ disabled = false }) {
  const router = useRouter();
  const { refreshAuth } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function proceed() {
    setBusy(true);
    setError("");

    try {
      // رزروهای منقضی ابتدا آزاد می‌شوند.
      await api("shipping-methods/");

      const cart = await api("cart/");

      const invalidCart =
        !cart.items?.length ||
        cart.can_checkout === false ||
        cart.unavailable_product_ids?.length > 0 ||
        cart.items.some(
          (item) =>
            item.is_available === false ||
            item.quantity > item.stock
        );

      if (invalidCart) {
        throw new Error(
          "موجودی و تعداد محصولات سبد را بررسی کنید."
        );
      }

      const state = await refreshAuth();

      if (!state.authenticated) {
        router.push("/login?next=%2Fcheckout");
      } else if (!state.profile?.is_complete) {
        router.push("/profile?next=%2Fcheckout");
      } else {
        router.push("/checkout");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        className="checkout-button"
        disabled={disabled || busy}
        onClick={proceed}
      >
        {busy ? "در حال بررسی…" : "ادامهٔ خرید"}
      </button>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}