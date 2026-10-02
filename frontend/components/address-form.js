"use client";

import { useState } from "react";

import { accountMutation } from "../lib/api";
import Popup from "./popup";

export default function AddressForm({
  address,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    title: address.title || "",
    province: address.province || "",
    city: address.city || "",
    address_line: address.address_line || "",
    landline: address.landline || "",
    postal_code: address.postal_code || "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function change(event) {
    setForm((value) => ({
      ...value,
      [event.target.name]: event.target.value,
    }));
  }

  async function save(event) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      const result = await accountMutation(
        address.id
          ? `account/addresses/${address.id}/`
          : "account/addresses/",
        address.id ? "PATCH" : "POST",
        form
      );

      onSaved(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popup
      title={address.id ? "ویرایش آدرس" : "افزودن آدرس"}
      onClose={onClose}
      busy={busy}
    >
      <form className="account-form" onSubmit={save}>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <label>
          عنوان آدرس
          <input
            name="title"
            value={form.title}
            onChange={change}
            maxLength={100}
            required
            disabled={busy}
            placeholder="مثلاً خانه یا محل کار"
          />
        </label>

        <div className="form-grid">
          <label>
            استان
            <input
              name="province"
              value={form.province}
              onChange={change}
              maxLength={100}
              required
              disabled={busy}
            />
          </label>

          <label>
            شهر
            <input
              name="city"
              value={form.city}
              onChange={change}
              maxLength={100}
              required
              disabled={busy}
            />
          </label>
        </div>

        <label>
          نشانی کامل
          <textarea
            name="address_line"
            value={form.address_line}
            onChange={change}
            maxLength={1000}
            rows={3}
            required
            disabled={busy}
            placeholder="خیابان، کوچه، پلاک و واحد"
          />
        </label>

        <div className="form-grid">
          <label>
            تلفن ثابت (اختیاری)
            <input
              name="landline"
              type="tel"
              dir="ltr"
              value={form.landline}
              onChange={change}
              maxLength={11}
              disabled={busy}
              placeholder="02112345678"
            />
          </label>

          <label>
            کد پستی
            <input
              name="postal_code"
              inputMode="numeric"
              dir="ltr"
              value={form.postal_code}
              onChange={change}
              minLength={10}
              maxLength={10}
              required
              disabled={busy}
            />
          </label>
        </div>

        <button disabled={busy}>
          {busy ? "در حال ذخیره…" : "ذخیرهٔ آدرس"}
        </button>
      </form>
    </Popup>
  );
}