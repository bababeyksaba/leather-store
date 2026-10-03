"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  api,
  accountMutation,
  money,
} from "../../../lib/api";

import { useAuth } from "../../../components/auth-context";
import { useCart } from "../../../components/cart-context";
import OrderFulfillment from "../../../components/order-fulfillment";

export default function TestPaymentPage({ params }) {
  const { number } = use(params);

  const router = useRouter();
  const { refreshAuth } = useAuth();
  const { refresh: refreshCart } = useCart();

  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const session = await refreshAuth();

      if (!active) return;

      if (!session.authenticated) {
        router.replace("/login");
        return;
      }

      const result = await api(`orders/${number}/`);

      if (active) setOrder(result);
    }

    setError("");

    load().catch((err) => {
      if (active) setError(err.message);
    });

    return () => {
      active = false;
    };
  }, [number, refreshAuth, router, retry]);

  async function action(path) {
    setBusy(true);
    setError("");

    try {
      const result = await accountMutation(
        `orders/${number}/${path}/`,
        "POST"
      );

      setOrder(result);

      if (result.status !== "pending") {
        sessionStorage.removeItem("checkout_request");
      }

      await refreshCart();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-page">
      <h1>پرداخت آزمایشی</h1>

      <p className="account-note">
        این صفحه درگاه بانکی نیست. هیچ پولی جابه‌جا نمی‌شود.
      </p>

      <button
        disabled={busy}
        onClick={() => setRetry((value) => value + 1)}
      >
        به‌روزرسانی وضعیت
      </button>

      {error && (
        <p className="error" role="alert">
          {error}

          <button
            disabled={busy}
            onClick={() => setRetry((value) => value + 1)}
          >
            تلاش دوباره
          </button>
        </p>
      )}

      {!order ? (
        <p>در حال دریافت سفارش…</p>
      ) : (
        <div className="account-panel">
          <p>
            شماره سفارش:
            {" "}
            <b dir="ltr">{order.number}</b>
          </p>

          <p>وضعیت پرداخت: {order.status_label}</p>

          <h2>مبلغ: {money(order.total)}</h2>

          <p>
            {order.recipient_name} · {order.phone}
          </p>

          <p>
            {order.province}، {order.city}،
            {" "}
            {order.address_line}
          </p>

          <p>روش ارسال: {order.shipping_name}</p>

          <OrderFulfillment order={order} />

          {order.items.map((item) => (
            <p key={item.id || item.cart_key}>
              {item.name} {[item.color, item.size].filter(Boolean).join(" / ")} · {money(item.quantity)} عدد ·
              {" "}
              {money(item.item_total)}
            </p>
          ))}

          {order.status === "pending" && (
            <>
              <p>
                مهلت پرداخت:
                {" "}
                {new Date(order.expires_at).toLocaleString(
                  "fa-IR"
                )}
              </p>

              <button
                className="checkout-button"
                disabled={busy}
                onClick={() => action("test-payment")}
              >
                {busy
                  ? "در حال بررسی…"
                  : "شبیه‌سازی پرداخت موفق"}
              </button>

              <button
                className="plain-button"
                disabled={busy}
                onClick={() => action("cancel")}
              >
                لغو سفارش و آزادسازی موجودی
              </button>
            </>
          )}

          {order.status === "paid" && (
            <p className="success">
              پرداخت آزمایشی موفق بود. این سفارش در بخش
              سفارشات حساب شما ثبت شده است.
            </p>
          )}

          {(order.status === "cancelled" ||
            order.status === "expired") && (
            <p>
              موجودی رزروشده آزاد شده است؛ می‌توانید دوباره
              سفارش بدهید.
            </p>
          )}

          <p>
            <Link href="/profile">
              مشاهدهٔ سفارش‌ها در حساب کاربری ←
            </Link>
          </p>

          <Link href="/cart">بازگشت به سبد</Link>
        </div>
      )}
    </section>
  );
}

