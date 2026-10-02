"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  api,
  accountMutation,
  money,
} from "../../lib/api";

import { useAuth } from "../../components/auth-context";

export default function CheckoutPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();

  const [data, setData] = useState(null);
  const [addressId, setAddressId] = useState("");
  const [shippingId, setShippingId] = useState("");
  const [pending, setPending] = useState(null);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  const lock = useRef(false);

  useEffect(() => {
    let active = true;

    setError("");
    setData(null);

    async function load() {
      const session = await refreshAuth();

      if (!active) return;

      if (!session.authenticated) {
        router.replace("/login?next=%2Fcheckout");
        return;
      }

      if (!session.profile?.is_complete) {
        router.replace("/profile?next=%2Fcheckout");
        return;
      }

      const shipping = await api("shipping-methods/");

      const [account, cart, orders] = await Promise.all([
        api("account/checkout/"),
        api("cart/"),
        api("orders/"),
      ]);

      let saved;

      try {
        saved = JSON.parse(
          sessionStorage.getItem("checkout_request") || "null"
        );
      } catch {}

      const previous = orders.find(
        (order) =>
          order.idempotency_key === saved?.key &&
          order.status === "pending"
      );

      if (
        saved &&
        !previous &&
        orders.some(
          (order) => order.idempotency_key === saved.key
        )
      ) {
        sessionStorage.removeItem("checkout_request");
      }

      if (active) {
        setPending(previous || null);
        setData({ account, cart, shipping });

        setAddressId(
          String(account.addresses[0]?.id || "")
        );

        setShippingId(String(shipping[0]?.id || ""));
      }
    }

    load().catch((err) => {
      if (active) setError(err.message);
    });

    return () => {
      active = false;
    };
  }, [refreshAuth, router, retry]);

  async function submit(event) {
    event.preventDefault();

    if (lock.current) return;

    lock.current = true;
    setBusy(true);
    setError("");

    try {
      const signature = JSON.stringify({
        addressId,
        shippingId,
        items: data.cart.items.map((item) => [
          item.product_id,
          item.quantity,
        ]),
      });

      let saved;

      try {
        saved = JSON.parse(
          sessionStorage.getItem("checkout_request") || "null"
        );
      } catch {}

      if (!saved || saved.signature !== signature) {
        saved = {
          signature,
          key: crypto.randomUUID(),
        };
      }

      sessionStorage.setItem(
        "checkout_request",
        JSON.stringify(saved)
      );

      const order = await accountMutation(
        "orders/",
        "POST",
        {
          address_id: Number(addressId),
          shipping_method_id: Number(shippingId),
          idempotency_key: saved.key,
        }
      );

      router.push(`/payment/${order.number}`);
    } catch (err) {
      setError(err.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div>
        {error ? (
          <p className="error">
            {error}

            <button
              onClick={() => setRetry((value) => value + 1)}
            >
              تلاش دوباره
            </button>
          </p>
        ) : (
          <p>در حال بررسی اطلاعات خرید…</p>
        )}
      </div>
    );
  }

  const { account, cart, shipping } = data;

  const method = shipping.find(
    (item) => String(item.id) === shippingId
  );

  const invalid =
    !cart.items?.length ||
    cart.can_checkout === false ||
    cart.unavailable_product_ids?.length > 0 ||
    cart.items.some(
      (item) =>
        item.is_available === false ||
        item.quantity > item.stock
    );

  return (
    <section className="account-page">
      <h1>تأیید سفارش</h1>

      <p className="account-note">
        پرداخت در این نسخه آزمایشی است؛ هیچ مبلغی از حساب شما
        برداشت نمی‌شود. مبالغ مطابق واحد قیمت محصولات هستند.
      </p>

      {pending && (
        <div className="account-panel">
          <p>
            یک سفارش در انتظار پرداخت دارید. موجودی آن قبلاً
            رزرو شده است.
          </p>

          <Link href={`/payment/${pending.number}`}>
            ادامهٔ همان سفارش ←
          </Link>
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={submit}>
        <div className="account-panel">
          <h2>آدرس تحویل</h2>

          {account.addresses.map((address) => (
            <label className="address-card" key={address.id}>
              <input
                type="radio"
                name="address"
                required
                value={address.id}
                checked={addressId === String(address.id)}
                disabled={busy}
                onChange={(event) =>
                  setAddressId(event.target.value)
                }
              />

              <strong>{address.title}</strong>

              <p>
                {address.province}، {address.city}،
                {" "}
                {address.address_line}
              </p>

              <p>کد پستی: {address.postal_code}</p>
            </label>
          ))}

          {!account.addresses.length && (
            <p>ابتدا یک آدرس ثبت کنید.</p>
          )}

          <Link href="/profile?next=%2Fcheckout">
            ثبت یا ویرایش آدرس ←
          </Link>
        </div>

        <div className="account-panel">
          <h2>روش ارسال</h2>

          {shipping.map((item) => (
            <label className="address-card" key={item.id}>
              <input
                type="radio"
                name="shipping"
                required
                value={item.id}
                checked={shippingId === String(item.id)}
                disabled={busy}
                onChange={(event) =>
                  setShippingId(event.target.value)
                }
              />

              {item.name} · {money(item.fee)}
              <p>{item.description}</p>
            </label>
          ))}

          {!shipping.length && (
            <p>
              مدیر فروشگاه باید روش ارسال را در پنل ادمین
              فعال کند.
            </p>
          )}
        </div>

        <div className="account-panel">
          <h2>خلاصهٔ خرید</h2>

          {cart.items?.map((item) => (
            <p key={item.product_id}>
              {item.name} · تعداد: {money(item.quantity)} ·
              {" "}
              {money(item.item_total)}
            </p>
          ))}

          <p>جمع محصولات: {money(cart.total_price)}</p>
          <p>ارسال: {money(method?.fee || 0)}</p>

          <strong>
            مبلغ نهایی نمایشی:
            {" "}
            {money(
              Number(cart.total_price) +
                Number(method?.fee || 0)
            )}
          </strong>

          <p>
            مبلغ قطعی هنگام ثبت سفارش در Django محاسبه می‌شود.
          </p>

          {invalid && (
            <p className="error">
              سبد خالی است یا موجودی کافی نیست.
              {" "}
              <Link href="/cart">بررسی سبد</Link>
            </p>
          )}

          <button
            className="checkout-button"
            disabled={
              busy ||
              invalid ||
              !addressId ||
              !method ||
              Boolean(pending)
            }
          >
            {busy
              ? "در حال ثبت…"
              : "ثبت سفارش و پرداخت آزمایشی"}
          </button>
        </div>
      </form>
    </section>
  );
}