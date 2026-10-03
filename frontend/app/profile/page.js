"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  api,
  accountMutation,
  money,
  imageUrl,
  safeNext,
} from "../../lib/api";

import { useAuth } from "../../components/auth-context";
import { useCart } from "../../components/cart-context";

import AddressForm from "../../components/address-form";
import Popup from "../../components/popup";
import OrdersPanel from "../../components/orders-panel";

export default function ProfilePage() {
  const router = useRouter();

  const {
    session,
    loading,
    error: authError,
    refreshAuth,
  } = useAuth();

  const { refresh: refreshCart } = useCart();

  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    gender: "",
    birth_date: "",
  });

  const [addresses, setAddresses] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [support, setSupport] = useState(null);

  const [supportOpen, setSupportOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (loading || !session) return;

    if (!session.authenticated) {
      router.replace(`/login${window.location.search}`);
      return;
    }

    let active = true;

    setError("");

    Promise.all([
      api("account/profile/"),
      api("account/addresses/"),
      api("account/favorites/"),
      api("account/support/"),
    ])
      .then(([p, a, f, s]) => {
        if (!active) return;

        setProfile(p);

        setForm({
          first_name: p.first_name,
          last_name: p.last_name,
          gender: p.gender,
          birth_date: p.birth_date || "",
        });

        setAddresses(a);
        setFavorites(f);
        setSupport(s);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, [loading, session?.authenticated, router, retry]);

  async function saveProfile(event) {
    event.preventDefault();

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const data = await accountMutation(
        "account/profile/",
        "PATCH",
        form
      );

      setProfile(data);
      await refreshAuth();

      setNotice("اطلاعات پروفایل ذخیره شد.");

      const next = safeNext(
        new URLSearchParams(window.location.search).get("next")
      );

      if (next === "/checkout" && data.is_complete) {
        router.push("/checkout");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function exit() {
    setBusy(true);
    setError("");

    try {
      await accountMutation("auth/logout/", "POST");
      await refreshAuth();
      await refreshCart();

      router.replace("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeFavorite(id) {
    setBusy(true);
    setError("");

    try {
      await accountMutation(
        `account/favorites/${id}/`,
        "DELETE"
      );

      setFavorites((items) =>
        items.filter((item) => item.id !== id)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const tabs = [
    ["profile", "پروفایل کاربری"],
    ["orders", "سفارشات"],
    ["favorites", "علاقه‌مندی‌ها"],
    ["support", "پشتیبانی"],
  ];

  if (loading) return <p>در حال دریافت حساب…</p>;

  if (authError) {
    return (
      <p className="error">
        {authError}

        <button onClick={() => refreshAuth().catch(() => {})}>
          تلاش دوباره
        </button>
      </p>
    );
  }

  if (!session?.authenticated) {
    return <p>در حال انتقال به ورود…</p>;
  }

  return (
    <section className="account-page">
      <div className="account-heading">
        <h1>حساب کاربری</h1>

        <button
          className="plain-button"
          disabled={busy}
          onClick={exit}
        >
          خروج از حساب
        </button>
      </div>

      {!profile?.is_complete && (
        <p className="account-note">
          برای ادامهٔ خرید، نام، نام خانوادگی، جنسیت و تاریخ
          تولد را کامل کنید.
        </p>
      )}

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

      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}

      <div className="account-tabs" aria-label="بخش‌های حساب">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);

              if (id === "support") setSupportOpen(true);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {!profile ? (
        <p>در حال دریافت اطلاعات…</p>
      ) : (
        <>
          {tab === "profile" && (
            <>
              <form
                className="account-form account-panel"
                onSubmit={saveProfile}
              >
                <label>
                  شمارهٔ موبایل تأییدشده
                  <input
                    dir="ltr"
                    value={profile.phone}
                    readOnly
                  />
                </label>

                <div className="form-grid">
                  <label>
                    نام
                    <input
                      value={form.first_name}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          first_name: event.target.value,
                        })
                      }
                      autoComplete="given-name"
                      maxLength={100}
                      required
                      disabled={busy}
                    />
                  </label>

                  <label>
                    نام خانوادگی
                    <input
                      value={form.last_name}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          last_name: event.target.value,
                        })
                      }
                      autoComplete="family-name"
                      maxLength={100}
                      required
                      disabled={busy}
                    />
                  </label>

                  <label>
                    جنسیت
                    <select
                      value={form.gender}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          gender: event.target.value,
                        })
                      }
                      required
                      disabled={busy}
                    >
                      <option value="">انتخاب کنید</option>
                      <option value="female">زن</option>
                      <option value="male">مرد</option>
                      <option value="other">سایر</option>
                    </select>
                  </label>

                  <label>
                    تاریخ تولد (میلادی)
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          birth_date: event.target.value,
                        })
                      }
                      required
                      disabled={busy}
                    />
                  </label>
                </div>

                <button disabled={busy}>
                  {busy ? "در حال ذخیره…" : "ذخیرهٔ اطلاعات"}
                </button>
              </form>

              <section className="account-panel">
                <div className="account-heading">
                  <h2>آدرس‌های من</h2>

                  <button
                    disabled={busy}
                    onClick={() => setEditingAddress({})}
                  >
                    افزودن آدرس
                  </button>
                </div>

                {!addresses.length && (
                  <p>هنوز آدرسی ثبت نکرده‌اید.</p>
                )}

                {addresses.map((address) => (
                  <article
                    className="address-card"
                    key={address.id}
                  >
                    <h3>{address.title} {address.is_default && <small> · پیش‌فرض</small>}</h3>

                    <p>
                      {address.province}، {address.city}،
                      {" "}
                      {address.address_line}
                    </p>

                    <p>کد پستی: {address.postal_code}</p>

                    {address.landline && (
                      <p>تلفن ثابت: {address.landline}</p>
                    )}

                    <button
                      className="plain-button"
                      disabled={busy}
                      onClick={() => setEditingAddress(address)}
                    >
                      ویرایش آدرس
                    </button>
                    {!address.is_default && <button className="plain-button" disabled={busy} onClick={async () => {
                      setBusy(true);
                      try { await accountMutation(`account/addresses/${address.id}/`, "PATCH", { is_default: true }); setAddresses(await api("account/addresses/")); }
                      catch (e) { setError(e.message); } finally { setBusy(false); }
                    }}>انتخاب پیش‌فرض</button>}
                    <button className="plain-button" disabled={busy} onClick={async () => {
                      if (!window.confirm("این آدرس حذف شود؟")) return;
                      setBusy(true);
                      try { await accountMutation(`account/addresses/${address.id}/`, "DELETE"); setAddresses(await api("account/addresses/")); }
                      catch (e) { setError(e.message); } finally { setBusy(false); }
                    }}>حذف آدرس</button>
                  </article>
                ))}
              </section>
            </>
          )}

          {tab === "orders" && <OrdersPanel />}

          {tab === "favorites" && (
            <div className="account-panel">
              <h2>علاقه‌مندی‌ها</h2>

              {!favorites.length && (
                <p>
                  هنوز محصولی به علاقه‌مندی‌ها اضافه نکرده‌اید.
                </p>
              )}

              <div className="grid">
                {favorites.map((product) => (
                  <article className="product" key={product.id}>
                    <Link
                      className="photo"
                      href={`/products/${product.id}/${encodeURIComponent(
                        product.slug
                      )}/`}
                    >
                      {imageUrl(product.image) && (
                        <img
                          src={imageUrl(product.image)}
                          alt={product.name}
                        />
                      )}
                    </Link>

                    <div className="product-body">
                      <h3>{product.name}</h3>
                      <p>{money(product.price)}</p>

                      <button
                        disabled={busy}
                        onClick={() => removeFavorite(product.id)}
                      >
                        حذف از علاقه‌مندی‌ها
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {tab === "support" && (
            <div className="account-panel">
              <h2>پشتیبانی</h2>

              <p>
                برای ارتباط با فروشگاه، اطلاعات تماس را باز کنید.
              </p>

              <button onClick={() => setSupportOpen(true)}>
                راه‌های ارتباطی
              </button>
            </div>
          )}
        </>
      )}

      {editingAddress && (
        <AddressForm
          address={editingAddress}
          onClose={() => setEditingAddress(null)}
          onSaved={(saved) => {
            setAddresses((items) => [
              saved,
              ...items.filter((item) => item.id !== saved.id),
            ]);

            setEditingAddress(null);
            setNotice("آدرس ذخیره شد.");
          }}
        />
      )}

      {supportOpen && (
        <Popup
          title="پشتیبانی فروشگاه"
          onClose={() => setSupportOpen(false)}
        >
          <div className="account-form">
            <label>
              شمارهٔ واتساپ
              <input
                dir="ltr"
                value={support?.whatsapp || "ثبت نشده"}
                readOnly
              />
            </label>

            <label>
              آیدی اینستاگرام
              <input
                dir="ltr"
                value={support?.instagram || "ثبت نشده"}
                readOnly
              />
            </label>
          </div>
        </Popup>
      )}
    </section>
  );
}

