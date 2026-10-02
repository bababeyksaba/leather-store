"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { accountMutation, safeNext } from "../../lib/api";
import { useAuth } from "../../components/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { session, loading, refreshAuth } = useAuth();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [remaining, setRemaining] = useState(0);

  function destination() {
    return safeNext(
      new URLSearchParams(window.location.search).get("next")
    );
  }

  function goNext(data) {
    const next = destination();

    router.replace(
      data.profile?.is_complete
        ? next
        : `/profile?next=${encodeURIComponent(next)}`
    );
  }

  useEffect(() => {
    if (!loading && session?.authenticated) {
      const next = safeNext(
        new URLSearchParams(window.location.search).get("next")
      );

      router.replace(
        session.profile?.is_complete
          ? next
          : `/profile?next=${encodeURIComponent(next)}`
      );
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (remaining <= 0) return;

    const timer = setTimeout(
      () => setRemaining((value) => value - 1),
      1000
    );

    return () => clearTimeout(timer);
  }, [remaining]);

  async function sendCode(event) {
    event?.preventDefault();

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await accountMutation(
        "auth/request-code/",
        "POST",
        { phone }
      );

      setStep("code");
      setCode("");
      setRemaining(60);
      setNotice(result.detail);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(event) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      await accountMutation(
        "auth/verify-code/",
        "POST",
        { phone, code }
      );

      goNext(await refreshAuth());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading || session?.authenticated) {
    return <p>در حال بررسی حساب…</p>;
  }

  return (
    <section className="login-box">
      <h1>ورود به حساب کاربری</h1>
      <p>با شمارهٔ موبایل خود وارد شوید.</p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}

      {step === "phone" ? (
        <form className="account-form" onSubmit={sendCode}>
          <label>
            شمارهٔ موبایل
            <input
              type="tel"
              dir="ltr"
              autoComplete="tel"
              placeholder="09123456789"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              maxLength={20}
              disabled={busy}
            />
          </label>

          <button disabled={busy}>
            {busy ? "در حال دریافت کد…" : "دریافت کد ورود"}
          </button>
        </form>
      ) : (
        <form className="account-form" onSubmit={verify}>
          <p>
            شمارهٔ موبایل: <b dir="ltr">{phone}</b>
          </p>

          <label>
            کد شش‌رقمی
            <input
              inputMode="numeric"
              dir="ltr"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              maxLength={6}
              minLength={6}
              disabled={busy}
            />
          </label>

          <button disabled={busy}>
            {busy ? "در حال بررسی…" : "تأیید و ورود"}
          </button>

          <button
            type="button"
            className="plain-button"
            disabled={busy || remaining > 0}
            onClick={sendCode}
          >
            {remaining > 0
              ? `ارسال مجدد پس از ${remaining} ثانیه`
              : "ارسال مجدد کد"}
          </button>

          <button
            type="button"
            className="plain-button"
            disabled={busy}
            onClick={() => {
              setStep("phone");
              setError("");
              setNotice("");
            }}
          >
            تغییر شماره
          </button>
        </form>
      )}
    </section>
  );
}