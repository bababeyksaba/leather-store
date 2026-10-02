"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { accountMutation } from "../lib/api";
import { useAuth } from "./auth-context";

export default function FavoriteButton({ productId }) {
  const router = useRouter();
  const { refreshAuth } = useAuth();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setBusy(true);
    setMessage("");

    try {
      const session = await refreshAuth();

      if (!session.authenticated) {
        router.push("/login");
        return;
      }

      await accountMutation(
        `account/favorites/${productId}/`,
        "POST"
      );

      setMessage("به علاقه‌مندی‌ها اضافه شد.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="favorite-control">
      <button
        className="plain-button"
        disabled={busy}
        onClick={save}
      >
        ♡ افزودن به علاقه‌مندی‌ها
      </button>

      {message && <small role="status">{message}</small>}
    </div>
  );
}