"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, accountMutation } from "../lib/api";
import { useAuth } from "./auth-context";

export default function ReviewForm({ productId, onSaved }) {
  const { session, loading } = useAuth();
  const [form, setForm] = useState({ rating: 5, title: "", comment: "" });
  const [existing, setExisting] = useState(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    if (session?.authenticated) api(`products/id/${productId}/review/`).then(data => {
      if (!active) return;
      setExisting(data); if (data) setForm({ rating: data.rating, title: data.title, comment: data.comment });
    }).catch(e => { if (active) setMessage(e.message); });
    return () => { active = false; };
  }, [productId, session?.authenticated]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const data = await accountMutation(`products/id/${productId}/review/`, "POST", { ...form, rating: Number(form.rating) }); setMessage(data.detail); setExisting({ ...form, is_approved: false }); }
    catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setMessage("");
    try { await accountMutation(`products/id/${productId}/review/`, "DELETE"); setExisting(null); setForm({ rating: 5, title: "", comment: "" }); onSaved(); }
    catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }
  if (loading) return <p>در حال بررسی ورود…</p>;
  if (!session?.authenticated) return <p>برای ثبت نظر <Link href={`/login?next=${encodeURIComponent(window.location.pathname)}`}>وارد حساب خود شوید</Link>.</p>;
  return <form className="review-form account-form" onSubmit={save}>
    <h3>{existing ? "ویرایش نظر شما" : "نظر و امتیاز شما"}</h3>
    {existing && <p>{existing.is_approved ? "نظر شما منتشر شده است؛ تغییر آن دوباره بررسی می‌شود." : "نظر شما در انتظار بررسی است."}</p>}
    <label>امتیاز<select value={form.rating} disabled={busy} onChange={e => setForm(v => ({ ...v, rating: e.target.value }))}>{[5, 4, 3, 2, 1].map(v => <option key={v} value={v}>{v} از ۵</option>)}</select></label>
    <label>عنوان (اختیاری)<input maxLength={150} disabled={busy} value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} /></label>
    <label>متن نظر<textarea required maxLength={3000} rows={4} disabled={busy} value={form.comment} onChange={e => setForm(v => ({ ...v, comment: e.target.value }))} /></label>
    <div className="actions"><button disabled={busy || !form.comment.trim()}>{busy ? "در حال ذخیره…" : "ثبت نظر"}</button>{existing && <button type="button" className="plain-button" disabled={busy} onClick={remove}>حذف نظر من</button>}</div>
    {message && <p role="status">{message}</p>}
  </form>;
}

