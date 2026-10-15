"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, accountMutation, money } from "../../../lib/api";

export default function PaymentPage({ params }) {
  const { number } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [mode, setMode] = useState("unavailable");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const [o, p] = await Promise.all([
      api(`orders/${encodeURIComponent(number)}/`),
      api("payments/mode/"),
    ]);
    setOrder(o);
    setMode(p.mode);
  }, [number]);

  useEffect(() => {
    reload().catch((err) => setError(err.message || "خطا در دریافت سفارش"));
  }, [reload]);

  async function proceed() {
    if (busy || !order || order.status !== "pending") return;
    setBusy(true);
    setError("");
    try {
      if (mode === "test") {
        await accountMutation(`orders/${encodeURIComponent(number)}/test-payment/`, "POST", {});
        await reload();
      } else if (mode === "digipay") {
        const payment = await accountMutation(`orders/${encodeURIComponent(number)}/digipay/start/`, "POST", {});
        const target = new URL(payment.redirectUrl);
        if (target.protocol !== "https:" || !/(^|\.)(mydigipay\.com|mydigipay\.info)$/i.test(target.hostname)) {
          throw new Error("نشانی درگاه پرداخت معتبر نیست.");
        }
        window.location.assign(target.href);
        return;
      } else {
        throw new Error("درگاه پرداخت هنوز فعال نشده است.");
      }
    } catch (err) {
      setError(err.message || "شروع پرداخت ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-page" dir="rtl">
      <h1>پرداخت سفارش</h1>
      {error && <p className="error" role="alert">{error}</p>}
      {!order ? (
        <p>در حال بارگذاری سفارش…</p>
      ) : (
        <div className="account-panel">
          <p>شماره سفارش: {order.display_number || order.number}</p>
          <p>مبلغ سفارش مطابق واحد نمایش سایت: {money(order.total)}</p>
          <p>وضعیت: {order.status_label || order.status}</p>
          {order.status === "pending" && (
            <button type="button" className="checkout-button" disabled={busy || mode === "unavailable"} onClick={proceed}>
              {busy ? "در حال پردازش…" : mode === "digipay" ? "پرداخت با دیجی‌پی" : mode === "test" ? "تکمیل پرداخت آزمایشی" : "پرداخت غیرفعال است"}
            </button>
          )}
          <p><Link href="/checkout">بازگشت به تسویه‌حساب</Link></p>
        </div>
      )}
    </section>
  );
}