"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, accountMutation } from "../lib/api";
import { useAuth } from "./auth-context";

// Share one initial request across cards, and keep hearts in sync.
let favoriteIds = new Set();
let pendingLoad = null;
const listeners = new Set();
function publish() { listeners.forEach(fn => fn()); }
function loadFavorites() {
  if (!pendingLoad) pendingLoad = api("account/favorites/").then(data => {
    favoriteIds = new Set((Array.isArray(data) ? data : data.results || []).map(p => Number(p.id)));
    publish();
  }).catch(() => { pendingLoad = null; });
  return pendingLoad;
}
export default function FavoriteButton({ productId, compact = false }) {
  const router = useRouter();
  const { session, refreshAuth } = useAuth();
  const [selected, setSelected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const sync = () => setSelected(favoriteIds.has(Number(productId)));
    listeners.add(sync);
    if (session?.authenticated) { sync(); loadFavorites(); }
    else { favoriteIds = new Set(); pendingLoad = null; setSelected(false); }
    return () => listeners.delete(sync);
  }, [productId, session?.authenticated]);
  async function toggle() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const auth = await refreshAuth();
      if (!auth.authenticated) { router.push("/login"); return; }
      await accountMutation(`account/favorites/${productId}/`, selected ? "DELETE" : "POST");
      if (selected) favoriteIds.delete(Number(productId)); else favoriteIds.add(Number(productId));
      publish();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="favorite-control">
    <button type="button" className={`${compact ? "luxury-favorite" : "plain-button"}${selected ? " is-favorite" : ""}`}
      aria-label={selected ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
      aria-pressed={selected} disabled={busy} onClick={toggle}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill={selected ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>
      {!compact && (selected ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها")}
    </button>
    {error && <small role="alert">{error}</small>}
  </div>;
}
