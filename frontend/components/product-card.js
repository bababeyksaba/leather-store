"use client";

import { useState } from "react";
import Link from "next/link";
import { money, imageUrl } from "../lib/api";
import PriceUnit from "./price-unit";

import FavoriteButton from "./favorite-button";

export default function ProductCard({ product, cart, busy, onAdd }) {
  const variants = product.variants || [];
  const [variantId, setVariantId] = useState(
    variants.find(v => v.stock > 0)?.id ?? variants[0]?.id
  );
  const [failedImage, setFailedImage] = useState("");
  const variant = variants.find(v => v.id === variantId);
  const image = imageUrl(variant?.image || product.image);
  const href = `/products/${product.id}/${encodeURIComponent(product.slug || "product")}/`;
  const inCart = (cart?.items || []).filter(i => i.product_id === product.id)
    .reduce((sum, i) => sum + Number(i.quantity), 0);
  const selectedInCart = cart?.items?.find(i => i.variant_id === variantId)?.quantity || 0;
  const remaining = Math.max(0, Math.min((variant?.stock || 0) - selectedInCart, 10000 - selectedInCart));
  const available = Boolean(variant?.stock > 0 && product.is_active !== false);
  const rating = Number(product.average_rating);
  const hasRating = product.average_rating != null && rating > 0;

  return (
    <article className="product luxury-card">
      <div className="luxury-photo-wrap">
        <Link href={href} className="photo" aria-label={`مشاهدهٔ ${product.name}`}>
          {image && failedImage !== image ? (
            <img src={image} alt={product.name} loading="lazy" decoding="async"
              onError={() => setFailedImage(image)} />
          ) : <span className="luxury-placeholder">تصویر محصول در دسترس نیست</span>}
        </Link>
        <FavoriteButton productId={product.id} compact />
      </div>
      <div className="product-body">
        <div className="luxury-title-row">
          <h2><Link href={href}>{product.name}</Link></h2>
          <span className="luxury-material">{product.material || product.category?.name || "محصول"}</span>
        </div>
        <div className="luxury-rating-palette">
          <span className="luxury-rating"> {hasRating ? `${money(rating)} از ۵` : "بدون امتیاز"}<small>
    {" "}({money(product.review_count || 0)} امتیاز) </small></span>
          <div className="luxury-palette" role="group" aria-label="انتخاب رنگ">
            {[...new Set(variants.map(v => v.color))].map(color => {
              const choices = variants.filter(v => v.color === color);
              const option = choices.find(v => v.size === variant?.size && v.stock > 0) || choices.find(v => v.stock > 0) || choices[0];
              return <button type="button" key={color} className="luxury-swatch"
                style={{ "--swatch": /^#[0-9a-f]{6}$/i.test(option.color_hex || "") ? option.color_hex : "#ddd" }}
                title={color || "بدون رنگ"} aria-label={color || "بدون رنگ"}
                aria-pressed={variant?.color === color} disabled={busy}
                onClick={() => setVariantId(option.id)} />;
            })}
          </div>
        </div>
        <div className="luxury-status-row">
          <span className={`luxury-stock ${available ? "available" : ""}`}><i aria-hidden="true" />{available ? "موجود در فروشگاه" : "ناموجود"}</span>
          <small>{variant?.color}</small>
        </div>
        {variants.some(v => v.size) && <label className="luxury-size">سایز
          <select value={variantId ?? ""} disabled={busy} onChange={e => setVariantId(Number(e.target.value))}>
            {variants.filter(v => v.color === variant?.color).map(v => <option key={v.id} value={v.id}>{v.size || "بدون سایز"}{v.stock < 1 ? " — ناموجود" : ""}</option>)}
          </select>
        </label>}
        <div className="luxury-cart-count" aria-live="polite">
          {inCart > 0 ? `✓ ${money(inCart)} عدد در سبد خرید شما` : ""}
        </div>
        <div className="luxury-bottom">
          <p className="card-price">{money(variant?.price ?? product.price)} <small><PriceUnit /></small></p>
          <button type="button" className="luxury-buy"
            disabled={busy || !available || remaining < 1}
            onClick={() => onAdd(variantId, 1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 7h14l1 14H4L5 7Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></svg>
            {busy ? "در حال ثبت…" : !available ? "ناموجود" : remaining < 1 ? "در سبد شما" : "افزودن به سبد"}
          </button>
        </div>
      </div>
    </article>
  );
}
