
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PaymentResultPage() {
  const [result, setResult] = useState({
    status: "loading",
    order: "",
    message: "در حال بررسی وضعیت پرداخت...",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const order = params.get("order") || "";

    if (!/^[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/.test(order)) {
      setResult({
        status: "invalid",
        order: "",
        message: "شماره سفارش معتبر نیست.",
      });
      return;
    }

    const controller = new AbortController();

    async function checkPayment() {
      try {
        const response = await fetch(
          `/api/orders/${encodeURIComponent(order)}/digipay/status/`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (response.status === 401 || response.status === 403) {
          setResult({
            status: "auth",
            order,
            message: "برای مشاهده نتیجه پرداخت، وارد حساب خود شوید.",
          });
          return;
        }

        if (!response.ok) {
          throw new Error("Payment status unavailable");
        }

        const data = await response.json();

        if (
          data.orderStatus === "paid" &&
          data.paymentStatus === "verified"
        ) {
          setResult({
            status: "success",
            order,
            message: "سفارش شما با موفقیت ثبت شد!",
          });
        } else if (
          data.paymentStatus === "review" ||
          data.paymentStatus === "verifying"
        ) {
          setResult({
            status: "review",
            order,
            message: "نتیجه پرداخت شما در حال بررسی است.",
          });
        } else {
          setResult({
            status: "pending",
            order,
            message: "پرداخت این سفارش هنوز تأیید نشده است.",
          });
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setResult({
            status: "error",
            order,
            message: "امکان بررسی وضعیت پرداخت وجود ندارد.",
          });
        }
      }
    }

    checkPayment();

    return () => controller.abort();
  }, []);

  const success = result.status === "success";
  const loading = result.status === "loading";

  return (
    <main className="payment-result-page" dir="rtl">
      <div className="payment-card">
        <div className={`payment-icon ${success ? "success" : ""}`}>
          {success ? (
            <svg
              viewBox="0 0 24 24"
              width="40"
              height="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : loading ? (
            <span className="loading-spinner" aria-hidden="true" />
          ) : (
            <span aria-hidden="true">!</span>
          )}
        </div>

        <h1>{loading ? "بررسی نتیجه پرداخت" : result.message}</h1>

        {success ? (
          <p className="payment-description">
            پرداخت شما با موفقیت تأیید شد.
            <br />
            سفارش شما در فروشگاه <strong>Luxe Leather</strong> ثبت شده است.
            <br />
            برای مشاهده وضعیت و پیگیری سفارش، به بخش
            <strong> پروفایل ← سفارشات </strong>
            مراجعه کنید.
          </p>
        ) : (
          <p className="payment-description">
            {loading
              ? "لطفاً چند لحظه منتظر بمانید."
              : result.status === "review"
                ? "وضعیت تراکنش باید بررسی شود. لطفاً دوباره پرداخت نکنید."
                : result.status === "pending"
                  ? "در صورت برداشت وجه، دوباره پرداخت نکنید و با پشتیبانی هماهنگ کنید."
                  : result.status === "auth"
                    ? "برای بررسی سفارش، با همان حسابی که خرید کرده‌اید وارد شوید."
                    : result.status === "error"
                      ? "پیش از تلاش برای پرداخت مجدد، با پشتیبانی هماهنگ کنید."
                      : "لطفاً از بخش سفارشات وضعیت سفارش خود را بررسی کنید."}
          </p>
        )}

        {result.order && (
          <div className="order-box">
            <span>شماره پیگیری سفارش در فروشگاه</span>
            <strong dir="ltr">{result.order}</strong>
          </div>
        )}

        <div className="payment-actions">
          {result.status === "auth" ? (
            <Link
              href="/login?next=%2Fprofile"
              className="primary-action"
            >
              ورود به حساب کاربری
            </Link>
          ) : (
            <Link href="/profile" className="primary-action">
              مشاهده و پیگیری سفارشات
              <span aria-hidden="true">←</span>
            </Link>
          )}

          <Link href="/" className="secondary-action">
            بازگشت به فروشگاه
          </Link>
        </div>

        {success && (
          <p className="payment-footer">
            از خرید و اعتماد شما سپاسگزاریم.
          </p>
        )}
      </div>

      <style jsx>{`
        .payment-result-page {
          min-height: 70vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 55px 20px;
          background: #faf9f7;
          font-family: inherit;
        }

        .payment-card {
          width: 100%;
          max-width: 590px;
          padding: 48px 36px;
          background: #fff;
          border: 1px solid #eae7e2;
          border-radius: 20px;
          box-shadow: 0 16px 50px rgba(25, 23, 20, 0.055);
          text-align: center;
        }

        .payment-icon {
          width: 82px;
          height: 82px;
          margin: 0 auto 26px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 50%;
          background: #fff3e6;
          color: #b77524;
          font-size: 40px;
          font-weight: 600;
        }

        .payment-icon.success {
          background: #e8f6ec;
          color: #208348;
        }

        h1 {
          font-size: 25px;
          font-weight: 700;
          color: #1f1f1f;
          line-height: 1.8;
          margin: 0 0 14px;
        }

        .payment-description {
          color: #666;
          line-height: 2.35;
          font-size: 14px;
          margin: 0 auto 28px;
        }

        .payment-description strong {
          color: #333;
          font-weight: 700;
        }

        .order-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #faf9f7;
          border: 1px solid #eeeae4;
          border-radius: 12px;
          padding: 20px 12px;
          margin-bottom: 28px;
        }

        .order-box span {
          font-size: 13px;
          color: #777;
        }

        .order-box strong {
          font-size: 13px;
          font-weight: 600;
          color: #333;
          overflow-wrap: anywhere;
        }

        .payment-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .payment-actions :global(a) {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          min-height: 52px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: opacity 0.2s ease;
        }

        .payment-actions :global(a:hover) {
          opacity: 0.82;
        }

        .payment-actions :global(.primary-action) {
          background: #25221f;
          color: #fff;
        }

        .payment-actions :global(.secondary-action) {
          border: 1px solid #dedbd5;
          background: #fff;
          color: #333;
        }

        .payment-footer {
          margin: 25px 0 0;
          font-size: 12px;
          color: #999;
        }

        .loading-spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #edd7bf;
          border-top-color: #ad722b;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 600px) {
          .payment-result-page {
            padding: 26px 14px;
          }

          .payment-card {
            padding: 35px 20px;
          }

          h1 {
            font-size: 21px;
          }

          .order-box strong {
            font-size: 11px;
          }
        }
      `}</style>
    </main>
  );
}
