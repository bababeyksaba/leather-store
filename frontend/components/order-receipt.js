"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./order-receipt.module.css";

export default function OrderReceipt({ order }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef(null);

  const number = order?.display_number
    ? String(order.display_number)
    : "";

  useEffect(() => {
    setCopied(false);
    setError("");

    return () => clearTimeout(timer.current);
  }, [number]);

  async function copyNumber() {
    if (!number) return;

    setError("");
    setCopied(false);

    try {
      await navigator.clipboard.writeText(number);

      setCopied(true);

      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError(
        "کپی خودکار انجام نشد؛ شماره را انتخاب و کپی کنید."
      );
    }
  }

  if (!order) return null;

  return (
    <section
      className={styles.receipt}
      aria-label="شماره سفارش"
    >
      <p className={styles.heading}>
        {order.status === "paid"
          ? "سفارش شما با موفقیت ثبت و پرداخت شد"
          : "شمارهٔ سفارش شما"}
      </p>

      <div className={styles.numberRow}>
        <strong className={styles.number} dir="ltr">
          {number || "—"}
        </strong>

        <button
          type="button"
          className={styles.copyButton}
          onClick={copyNumber}
          disabled={!number}
          aria-label={
            copied ? "شماره سفارش کپی شد" : "کپی شماره سفارش"
          }
          title={
            copied ? "کپی شد" : "کپی شماره سفارش"
          }
        >
          {copied ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect
                x="9"
                y="9"
                width="11"
                height="11"
                rx="2"
              />

              <path d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
            </svg>
          )}
        </button>
      </div>

      <p className={styles.note}>
        شمارهٔ سفارش را برای پیگیری نگه دارید.
      </p>

      <p className={styles.feedback} role="status">
        {copied ? "شمارهٔ سفارش کپی شد." : ""}
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {!number && (
        <p className={styles.error} role="alert">
          شمارهٔ سفارش از سرور دریافت نشده است.
        </p>
      )}
    </section>
  );
}