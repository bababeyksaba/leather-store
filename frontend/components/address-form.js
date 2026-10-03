"use client";

import { useEffect, useState } from "react";

import { api, accountMutation } from "../lib/api";
import Popup from "./popup";

export default function AddressForm({
  address,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    is_default: address.is_default || false,
    title: address.title || "",
    province: address.province || "",
    city: address.city || "",
    address_line: address.address_line || "",
    landline: address.landline || "",
    postal_code: address.postal_code || "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [locations, setLocations] = useState([]);
  useEffect(() => { api("locations/").then(setLocations).catch(e => setError(e.message)); }, []);
  const cities = locations.find(p => p.name === form.province)?.cities || [];
  function change(event) {
    setForm((value) => ({
      ...value,
      [event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value,
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
          <label>استان<select value={form.province} required disabled={busy || !locations.length} onChange={e => setForm(v => ({ ...v, province: e.target.value, city: "" }))}><option value="">انتخاب استان</option>{locations.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select></label>
          <label>شهر<select name="city" value={form.city} required disabled={busy || !form.province} onChange={change}><option value="">انتخاب شهر</option>{cities.map(city => <option key={city} value={city}>{city}</option>)}</select></label>
        </div>
        <label className="checkbox-label"><input type="checkbox" name="is_default" checked={form.is_default} onChange={change} disabled={busy} />آدرس پیش‌فرض من</label>

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
