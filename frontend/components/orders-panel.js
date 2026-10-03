"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api, accountMutation, money } from "../lib/api";
import { useCart } from "./cart-context";
import OrderFulfillment from "./order-fulfillment";

function isExpired(order, now) {
  if (order.status === "expired") {
    return true;
  }

  if (order.status !== "pending" || !order.expires_at) {
    return false;
  }

  const expiresAt = new Date(order.expires_at).getTime();

  return Number.isFinite(expiresAt) && expiresAt <= now;
}

export default function OrdersPanel() {
  const { refresh } = useCart();

  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;

    setError("");

    api("orders/")
      .then((data) => {
        if (!active) return;

        setOrders(
          Array.isArray(data) ? data : data.results ?? []
        );

        setNow(Date.now());
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      });

    return () => {
      active = false;
    };
  }, [retry]);

  // حتی اگر صفحه باز بماند، سفارش منقضی‌شده پنهان می‌شود.
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function cancel(number) {
    if (busy) return;

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

  const visibleOrders = (orders ?? []).filter(
    (order) => !isExpired(order, now)
  );

  return (
    <div className="account-panel">
      <h2>سفارشات من</h2>

      <p>پرداخت‌های این نسخه آزمایشی هستند.</p>

      <button
        type="button"
        disabled={busy}
        onClick={() => setRetry((value) => value + 1)}
      >
        به‌روزرسانی وضعیت سفارش‌ها
      </button>

      {error && (
        <p className="error" role="alert">
          {error}

          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
          >
            تلاش دوباره
          </button>
        </p>
      )}

      {orders === null ? (
        <p>در حال دریافت سفارش‌ها…</p>
      ) : visibleOrders.length === 0 ? (
        <div className="empty">
          <h3>سفارشی برای نمایش وجود ندارد.</h3>

          <p>
            سفارش‌هایی که مهلت پرداختشان تمام شده است،
            در این بخش نمایش داده نمی‌شوند.
          </p>

          <Link href="/">مشاهدهٔ محصولات</Link>
        </div>
      ) : (
        visibleOrders.map((order) => (
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

            {order.status === "pending" &&
              order.expires_at && (
                <p>
                  مهلت پرداخت:{" "}
                  {new Date(
                    order.expires_at
                  ).toLocaleString("fa-IR")}
                </p>
              )}

            <OrderFulfillment order={order} />

            {(order.items ?? []).map((item) => (
              <p key={item.id || item.cart_key}>
                {item.name}
                {" "}
                {[item.color, item.size]
                  .filter(Boolean)
                  .join(" / ")}
                {" · "}
                {money(item.quantity)} عدد
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
                  type="button"
                  disabled={busy}
                  onClick={() => cancel(order.number)}
                >
                  {busy ? "در حال ثبت…" : "لغو سفارش"}
                </button>
              </p>
            )}
          </article>
        ))
      )}
    </div>
  );
}