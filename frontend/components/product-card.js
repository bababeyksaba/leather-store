"use client";

import { useState } from "react";
import Link from "next/link";

import { money, imageUrl } from "../lib/api";
import PriceUnit from "./price-unit";
import FavoriteButton from "./favorite-button";

export default function ProductCard({
  product,
  cart,
  busy,
  onAdd,
}) {
  const variants = product.variants || [];

  const [variantId, setVariantId] = useState(
    variants.find((item) => item.stock > 0)?.id ??
      variants[0]?.id
  );

  const [failedImage, setFailedImage] = useState("");

  const variant = variants.find(
    (item) => item.id === variantId
  );

  const image = imageUrl(
    variant?.image || product.image
  );

  const href =
    `/products/${product.id}/` +
    `${encodeURIComponent(product.slug || "product")}/`;

  const cartItems = cart?.items || [];

  const inCart = cartItems
    .filter(
      (item) =>
        String(item.product_id) === String(product.id)
    )
    .reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );

  const selectedInCart = cartItems
    .filter(
      (item) =>
        String(item.product_id) === String(product.id) &&
        String(item.variant_id) === String(variantId)
    )
    .reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );

  const stock = Number(variant?.stock || 0);

  const remaining = Math.max(
    0,
    Math.min(
      stock - selectedInCart,
      10000 - selectedInCart
    )
  );

  const available =
    stock > 0 && product.is_active !== false;

  const rating = Number(product.average_rating);

  const hasRating =
    product.average_rating != null &&
    Number.isFinite(rating) &&
    rating > 0;

  const colors = [
    ...new Set(variants.map((item) => item.color)),
  ];

  return (
    <article
      className="product luxury-card"
      style={{ alignSelf: "start" }}
    >
      <div className="luxury-photo-wrap">
        <Link
          href={href}
          className="photo"
          aria-label={`مشاهدهٔ ${product.name}`}
        >
          {image && failedImage !== image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              onError={() => setFailedImage(image)}
            />
          ) : (
            <span className="luxury-placeholder">
              تصویر محصول در دسترس نیست
            </span>
          )}
        </Link>

        <FavoriteButton
          productId={product.id}
          compact
        />
      </div>

      <div className="product-body">
        <div className="luxury-title-row">
          <h2>
            <Link href={href}>
              {product.name}
            </Link>
          </h2>

          <span className="luxury-material">
            {product.material ||
              product.category?.name ||
              "محصول"}
          </span>
        </div>

        <div className="luxury-rating-palette">
          <span className="luxury-rating">
            {hasRating
              ? `${money(rating)} از ۵`
              : "بدون امتیاز"}

            {" "}

            <small>
              ({money(product.review_count || 0)} امتیاز)
            </small>
          </span>

          <div
            className="luxury-palette"
            role="group"
            aria-label="انتخاب رنگ"
          >
            {colors.map((color) => {
              const choices = variants.filter(
                (item) => item.color === color
              );

              const option =
                choices.find((item) => item.stock > 0) ||
                choices[0];

              const colorHex =
                /^#[0-9a-f]{6}$/i.test(
                  option.color_hex || ""
                )
                  ? option.color_hex
                  : "#dddddd";

              return (
                <button
                  key={color || "no-color"}
                  type="button"
                  className="luxury-swatch"
                  style={{ "--swatch": colorHex }}
                  title={color || "بدون رنگ"}
                  aria-label={color || "بدون رنگ"}
                  aria-pressed={variant?.color === color}
                  disabled={busy}
                  onClick={() => setVariantId(option.id)}
                />
              );
            })}
          </div>
        </div>

        <div className="luxury-status-row">
          <span
            className={`luxury-stock ${
              available ? "available" : ""
            }`}
          >
            <i aria-hidden="true" />

            {available
              ? "موجود در فروشگاه"
              : "ناموجود"}
          </span>

          <small>{variant?.color}</small>
        </div>

        {inCart > 0 && (
          <div
            className="luxury-cart-count"
            aria-live="polite"
            style={{
              minHeight: 0,
              margin: "0 0 6px",
              fontSize: "11px",
              lineHeight: 1.5,
            }}
          >
            ✓ {money(inCart)} عدد در سبد خرید شما
          </div>
        )}

        <div className="luxury-bottom">
          <p className="card-price">
            {money(variant?.price ?? product.price)}

            {" "}

            <small>
              <PriceUnit />
            </small>
          </p>

          <button
            type="button"
            className="luxury-buy"
            disabled={
              busy || !available || remaining < 1
            }
            onClick={() => onAdd(variantId, 1)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M5 7h14l1 14H4L5 7Z" />
              <path d="M8 8V6a4 4 0 0 1 8 0v2" />
            </svg>

            {busy
              ? "در حال ثبت…"
              : !available
                ? "ناموجود"
                : remaining < 1
                  ? "در سبد شما"
                  : "افزودن به سبد"}
          </button>
        </div>
      </div>
    </article>
  );
}