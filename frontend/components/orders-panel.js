"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api, accountMutation, money } from "../lib/api";
import { useCart } from "./cart-context";
import OrderFulfillment from "./order-fulfillment";
import OrderReceipt from "./order-receipt";

export default function OrdersPanel() {
  const { refresh } = useCart();

  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    setError("");

    api("orders/")
      .then((data) => {
        if (!active) return;

        setOrders(
          Array.isArray(data) ? data : data.results ?? []
        );
      })
      .catch((err) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, [retry]);

  async function cancel(number) {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await accountMutation(
        `orders/${number}/cancel/`,
        "POST"
      );

      setOrders((current) =>
        current
          ? current.filter((order) => order.number !== number)
          : current
      );

      await refresh();

      setRetry((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const visibleOrders = (orders ?? []).filter(
    (order) =>
      order.status !== "cancelled" &&
      order.status !== "expired"
  );

  return (
    <div className="account-panel">
      <h2>سفارش‌های من</h2>

      <p>پرداخت‌های این نسخه آزمایشی هستند.</p>

      <button
        type="button"
        disabled={busy}
        onClick={() => setRetry((value) => value + 1)}
      >
        به‌روزرسانی وضعیت سفارش‌ها
      </button>

      {error && (
        <div className="error" role="alert">
          <p>{error}</p>

          <button
            type="button"
            disabled={busy}
            onClick={() => setRetry((value) => value + 1)}
          >
            تلاش دوباره
          </button>
        </div>
      )}

      {orders === null ? (
        <p>در حال دریافت سفارش‌ها…</p>
      ) : !visibleOrders.length ? (
        <p>سفارشی برای نمایش ندارید.</p>
      ) : (
        visibleOrders.map((order) => (
          <article
            className="address-card"
            key={order.number}
          >
            <OrderReceipt order={order} />

            <h3>{order.status_label}</h3>

            <p>
              تاریخ ثبت:{" "}
              {new Date(order.created_at).toLocaleString("fa-IR")}
            </p>

            <p>مبلغ نهایی: {money(order.total)}</p>

            <OrderFulfillment order={order} />

            {(order.items ?? []).map((item) => (
              <p key={item.id || item.cart_key}>
                {item.name} {item.color}
                {" · "}
                {money(item.quantity)} عدد
              </p>
            ))}

            <Link href={`/payment/${order.number}`}>
              جزئیات سفارش
              {order.status === "pending"
                ? " و پرداخت آزمایشی"
                : ""}
              {" ←"}
            </Link>

            {order.status === "pending" && (
              <p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => cancel(order.number)}
                >
                  لغو سفارش
                </button>
              </p>
            )}
          </article>
        ))
      )}
    </div>
  );
}