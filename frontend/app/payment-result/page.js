"use client";

import { useEffect, useState } from "react";

export default function PaymentResultPage() {
  const [result, setResult] = useState({ loading: true, message: "در حال بررسی وضعیت سفارش…" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const order = params.get("order") || "";
    if (!/^[0-9a-fA-F-]{36}$/.test(order)) {
      setResult({ loading: false, message: "شماره سفارش معتبر نیست." });
      return;
    }
    const controller = new AbortController();
    async function check() {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(order)}/digipay/status/`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (res.status === 401 || res.status === 403) {
          setResult({ loading: false, message: "برای مشاهده وضعیت پرداخت، وارد حساب کاربری شوید." });
          return;
        }
        if (!res.ok) throw new Error("status unavailable");
        const data = await res.json();
        if (data.orderStatus === "paid" && data.paymentStatus === "verified") {
          setResult({ loading: false, message: "پرداخت تأیید شد و سفارش شما ثبت شده است." });
        } else if (data.paymentStatus === "review" || data.paymentStatus === "verifying") {
          setResult({ loading: false, message: "نتیجه پرداخت در حال بررسی است. لطفاً دوباره پرداخت نکنید." });
        } else {
          setResult({ loading: false, message: "پرداخت هنوز تأیید نشده است. وضعیت سفارش را بررسی کنید." });
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setResult({ loading: false, message: "دریافت وضعیت پرداخت ممکن نشد. پیش از پرداخت مجدد با پشتیبانی هماهنگ کنید." });
        }
      }
    }
    check();
    return () => controller.abort();
  }, []);

  return (
    <main dir="rtl" style={{ maxWidth: 660, margin: "70px auto", padding: "32px 24px", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.6rem", marginBottom: 20 }}>نتیجه پرداخت دیجی‌پی</h1>
      <p role="status" aria-live="polite">{result.message}</p>
      <a href="/" style={{ display: "inline-block", marginTop: 32 }}>بازگشت به فروشگاه</a>
    </main>
  );
}