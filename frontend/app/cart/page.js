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

  return (
    <>
      <section className="page-title">
        <p className="eyebrow">انتخاب‌های شما</p>
        <h1>سبد خرید</h1>
      </section>

      {error && (
        <p className="error" role="alert">
          {error}

          <button
            onClick={() => refresh().catch(() => {})}
          >
            تلاش دوباره
          </button>
        </p>
      )}

      {cart?.unavailable_items?.length > 0 && <div className="error" role="alert">
        <p>برخی اقلام دیگر قابل خرید نیستند. آن‌ها را از سبد حذف کنید.</p>
        {cart.unavailable_items.map(key => <button key={key} disabled={busy} onClick={() => remove(Number(key.split(":")[1])).catch(() => {})}>حذف قلم ناموجود {key}</button>)}
      </div>}

      {!cart ? (
        <p>در حال دریافت سبد خرید…</p>
      ) : !cart.items.length ? (
        <div className="empty">
          <h2>سبد خرید شما خالی است</h2>
          <Link href="/">مشاهدهٔ محصولات</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <section>
            {cart.items.map((item) => (
              <article
                className="cart-item"
                key={item.cart_key}
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
                  <p>{[item.color, item.size].filter(Boolean).join(" / ")}</p>

                  <p>
                    تعداد: {money(item.quantity)}
                    {" · "}
                    قیمت واحد: {money(item.unit_price)}
                  </p>

                  <p>موجودی: {money(item.stock)}</p>

                  {item.is_available === false && (
                    <p className="error">
                      موجودی فعلی برای این تعداد کافی نیست.
                      تعداد را کاهش بده یا محصول را حذف کن.
                    </p>
                  )}

                  <QuantityEditor
                    key={`${item.cart_key}-${item.quantity}`}
                    item={item}
                    update={update}
                    busy={busy}
                  />

                  <button
                    className="remove"
                    disabled={busy}
                    onClick={() =>
                      remove(item.variant_id).catch(() => {})
                    }
                  >
                    حذف از سبد
                  </button>
                </div>

                <strong>{money(item.item_total)}</strong>
              </article>
            ))}
          </section>

          <aside>
            <h2>خلاصهٔ سبد</h2>

            <p>
              تعداد کل:
              {" "}
              {money(
                cart.total_quantity ??
                  cart.items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  )
              )}
            </p>

            <p>مجموع قیمت</p>

            <strong className="total">
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
  const [quantity, setQuantity] = useState(item.quantity);
  const [error, setError] = useState("");

  const value = Number(quantity);

  const valid =
    Number.isInteger(value) &&
    value >= 1 &&
    value <= Math.min(item.stock, 10000);

  async function submit(event) {
    event.preventDefault();

    if (!valid) return;

    setError("");

    try {
      await update(item.variant_id, value);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <form className="actions" onSubmit={submit}>
        <input
          type="number"
          aria-label={`تعداد ${item.name}`}
          min="1"
          max={Math.min(item.stock, 10000)}
          step="1"
          value={quantity}
          disabled={busy}
          onChange={(event) =>
            setQuantity(event.target.value)
          }
        />

        <button
          type="submit"
          disabled={
            busy || !valid || value === item.quantity
          }
        >
          ثبت تعداد
        </button>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

