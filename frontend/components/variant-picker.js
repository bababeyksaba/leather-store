"use client";

export default function VariantPicker({
  variants = [],
  value,
  onChange,
  disabled = false,
}) {
  return (
    <label className="variant-picker">
      رنگ

      <select
        value={value ?? ""}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        disabled={disabled || !variants.length}
      >
        {!variants.length && (
          <option value="">ناموجود</option>
        )}

        {variants.map((variant) => (
          <option key={variant.id} value={variant.id}>
            {variant.color || "مدل اصلی"}
            {variant.stock < 1 ? " — ناموجود" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}