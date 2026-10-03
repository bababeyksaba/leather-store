"use client";
export default function VariantPicker({ variants = [], value, onChange, disabled = false }) {
  return <label className="variant-picker">رنگ و سایز
    <select value={value ?? ""} onChange={e => onChange(Number(e.target.value))} disabled={disabled || !variants.length}>
      {!variants.length && <option value="">ناموجود</option>}
      {variants.map(v => <option key={v.id} value={v.id}>{[v.color, v.size].filter(Boolean).join(" / ") || "مدل اصلی"}{v.stock < 1 ? " — ناموجود" : ""}</option>)}
    </select>
  </label>;
}