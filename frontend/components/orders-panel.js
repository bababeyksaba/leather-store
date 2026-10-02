"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api, accountMutation, money } from "../lib/api";
import { useCart } from "./cart-context";
import OrderFulfillment from "./order-fulfillment";

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
        if (active) setOrders(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, [retry]);

  async function cancel(number) {
    setBusy(true);
    setError("");

    try {
      await accountMutation(
        `orders/${number}/cancel/`,
        "POST"
      );

      await refresh();
      setRetry((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account-panel">
      <h2>سفارشات من</h2>

      <p>پرداخت‌های این نسخه آزمایشی هستند.</p>

      <button
        disabled={busy}
        onClick={() => setRetry((value) => value + 1)}
      >
        به‌روزرسانی وضعیت سفارش‌ها
      </button>

      {error && (
        <p className="error" role="alert">
          {error}

          <button
            onClick={() => setRetry((value) => value + 1)}
          >
            تلاش دوباره
          </button>
        </p>
      )}

      {!orders ? (
        <p>در حال دریافت سفارش‌ها…</p>
      ) : !orders.length ? (
        <p>هنوز سفارشی ثبت نکرده‌اید.</p>
      ) : (
        orders.map((order) => (
          <article
            className="address-card"
            key={order.number}
          >
            <small dir="ltr">{order.number}</small>

            <h3>{order.status_label}</h3>

            <p>
              {new Date(order.created_at).toLocaleString(
                "fa-IR"
              )}
            </p>

            <p>مبلغ نهایی: {money(order.total)}</p>

            <OrderFulfillment order={order} />

            {order.items.map((item) => (
              <p key={item.product_id}>
                {item.name} · {money(item.quantity)} عدد
              </p>
            ))}

            <Link href={`/payment/${order.number}`}>
              جزئیات سفارش
              {order.status === "pending"
                ? " و پرداخت آزمایشی"
                : ""}
              {" "}←
            </Link>

            {order.status === "pending" && (
              <p>
                <button
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