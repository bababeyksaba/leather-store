"use client";

import { useEffect, useRef } from "react";

export default function Popup({
  title,
  children,
  onClose,
  busy = false,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;

    dialog.showModal();

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      dialog.close();
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="account-dialog"
      aria-labelledby="popup-title"
      onCancel={(event) => {
        event.preventDefault();

        if (!busy) onClose();
      }}
    >
      <div className="popup-heading">
        <h2 id="popup-title">{title}</h2>

        <button
          type="button"
          className="plain-button"
          disabled={busy}
          onClick={onClose}
          aria-label="بستن"
        >
          ×
        </button>
      </div>

      {children}
    </dialog>
  );
}