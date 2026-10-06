"use client";

import { useState } from "react";
import Link from "next/link";

import { useCart } from "../../components/cart-context";
import { money, imageUrl } from "../../lib/api";
import CheckoutButton from "../../components/checkout-button";

export default function CartPage() {
  const {
    cart,
    error,
    busy,
    remove,
    refresh,
    update,
  } = useCart();

  const items = cart?.items || [];

  const totalQuantity =
    cart?.total_quantity ??
    items.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );

  return (
    <>
      <section className="page-title">
        <p className="eyebrow">انتخاب‌های شما</p>
        <h1>سبد خرید</h1>
      </section>

      {error && (
        <p className="error" role="alert">
          {error}

          {" "}

          <button
            type="button"
            disabled={busy}
            onClick={() => refresh().catch(() => {})}
          >
            تلاش دوباره
          </button>
        </p>
      )}

      {cart?.unavailable_items?.length > 0 && (
        <div className="error" role="alert">
          <p>
            برخی اقلام دیگر قابل خرید نیستند.
            آن‌ها را از سبد حذف کنید.
          </p>

          {cart.unavailable_items.map((key) => (
            <button
              type="button"
              key={key}
              disabled={busy}
              onClick={() =>
                remove(Number(key.split(":")[1])).catch(
                  () => {}
                )
              }
            >
              حذف قلم ناموجود {key}
            </button>
          ))}
        </div>
      )}

      {!cart ? (
        <p>در حال دریافت سبد خرید…</p>
      ) : items.length === 0 ? (
        <div className="empty">
          <h2>سبد خرید شما خالی است</h2>
          <Link href="/">مشاهدهٔ محصولات</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <section aria-label="محصولات سبد خرید">
            {items.map((item) => (
              <article
                className="cart-item"
                key={item.cart_key || item.variant_id}
              >
                <div className="cart-photo">
                  {imageUrl(item.image) && (
                    <img
                      src={imageUrl(item.image)}
                      alt={item.name}
                    />
                  )}
                </div>

                <div>
                  <h2>{item.name}</h2>

                  {item.color && <p>{item.color}</p>}

                  <p>
                    قیمت واحد: {money(item.unit_price)}
                  </p>

                  <p>
                    موجودی: {money(item.stock)}
                  </p>

                  {item.is_available === false && (
                    <p className="error">
                      موجودی فعلی برای این تعداد کافی نیست.
                      تعداد را کاهش بده یا محصول را حذف کن.
                    </p>
                  )}

                  <QuantityEditor
                    item={item}
                    update={update}
                    busy={busy}
                  />

                  <button
                    type="button"
                    className="remove"
                    disabled={busy}
                    onClick={() =>
                      remove(item.variant_id).catch(() => {})
                    }
                  >
                    حذف از سبد
                  </button>
                </div>

                <strong aria-live="polite">
                  {money(item.item_total)}
                </strong>
              </article>
            ))}
          </section>

          <aside>
            <h2>خلاصهٔ سبد</h2>

            <p aria-live="polite">
              تعداد کل: {money(totalQuantity)}
            </p>

            <p>مجموع قیمت</p>

            <strong className="total" aria-live="polite">
              {money(cart.total_price)}
            </strong>

            <p>
              هزینهٔ ارسال در مرحلهٔ بعد محاسبه می‌شود.
            </p>

            {cart.unavailable_product_ids?.length > 0 && (
              <p className="error">
                برخی محصولات سبد دیگر فعال نیستند.
              </p>
            )}

            <CheckoutButton disabled={busy} />

            <Link href="/">
              بازگشت به محصولات ←
            </Link>
          </aside>
        </div>
      )}
    </>
  );
}

function QuantityEditor({ item, update, busy }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const quantity = Number(item.quantity);
  const max = Math.min(Number(item.stock), 10000);

  async function changeQuantity(nextQuantity) {
    if (
      busy ||
      saving ||
      !Number.isInteger(nextQuantity) ||
      nextQuantity < 1 ||
      nextQuantity > max ||
      nextQuantity === quantity
    ) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await update(item.variant_id, nextQuantity);
    } catch (err) {
      setError(
        err.message || "تغییر تعداد انجام نشد."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cart-quantity-editor">
      <div
        className="cart-quantity-control"
        dir="ltr"
        role="group"
        aria-label={`تعداد ${item.name}`}
        aria-busy={saving}
      >
        <button
          type="button"
          aria-label={`کاهش تعداد ${item.name}`}
          disabled={busy || saving || quantity <= 1}
          onClick={() => changeQuantity(quantity - 1)}
        >
          −
        </button>

        <span aria-live="polite">
          {money(quantity)}
        </span>

        <button
          type="button"
          aria-label={`افزایش تعداد ${item.name}`}
          disabled={busy || saving || quantity >= max}
          onClick={() => changeQuantity(quantity + 1)}
        >
          +
        </button>
      </div>

      {saving && (
        <small
          className="cart-quantity-saving"
          role="status"
        >
          در حال به‌روزرسانی قیمت…
        </small>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}