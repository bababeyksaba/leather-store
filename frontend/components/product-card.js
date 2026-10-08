"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { money, imageUrl } from "../lib/api";
import FavoriteButton from "./favorite-button";
import PriceUnit from "./price-unit";

import styles from "./product-card.module.css";

const ratingFormat = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

export default function ProductCard({ product }) {
  const variants = (product.variants || []).filter(
    (variant) =>
      variant.is_active !== false &&
      Number(variant.stock) > 0
  );

  const colors = [];

  for (const variant of variants) {
    const color = (variant.color || "").trim();

    if (
      !color ||
      colors.some((item) => item.color === color)
    ) {
      continue;
    }

    colors.push({
      ...variant,
      color,
    });
  }

  // در ابتدا هیچ رنگی انتخاب نشده است.
  const [selectedId, setSelectedId] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);

  const selectedVariant = colors.find(
    (variant) =>
      String(variant.id) === String(selectedId)
  );

  // ابتدا تصویر اصلی؛ پس از انتخاب رنگ، تصویر همان رنگ.
  const image = imageUrl(
    selectedVariant
      ? selectedVariant.image || product.image
      : product.image
  );

  const price = selectedVariant?.price ?? product.price;

  const reviewCount = Math.max(
    0,
    Number(product.review_count) || 0
  );

  const suppliedAverage = Number(product.average_rating);

  const average =
    reviewCount > 0 &&
    product.average_rating != null &&
    Number.isFinite(suppliedAverage)
      ? Math.max(0, Math.min(5, suppliedAverage))
      : 5;

  const href =
    `/products/${product.id}/` +
    `${encodeURIComponent(product.slug || "product")}/`;

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  useEffect(() => {
    setSelectedId(null);
  }, [product.id, product.image]);

  return (
    <article className={styles.card}>
      <div className={styles.photoArea}>
        <Link
          href={href}
          className={styles.photo}
          aria-label={`مشاهدهٔ ${product.name}`}
        >
          {image && !imageFailed ? (
            <img
              src={image}
              alt={
                selectedVariant?.color
                  ? `${product.name}، رنگ ${selectedVariant.color}`
                  : product.name
              }
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className={styles.placeholder}>
              تصویر محصول در دسترس نیست
            </span>
          )}
        </Link>

        <div className={styles.favorite}>
          <FavoriteButton
            productId={product.id}
            compact
          />
        </div>
      </div>

      <div className={styles.body}>
        <h2 className={styles.title}>
          <Link href={href}>{product.name}</Link>
        </h2>

        <div className={styles.details}>
          <div
            className={styles.rating}
            title={
              reviewCount > 0
                ? "میانگین امتیاز کاربران"
                : "امتیاز پیش‌فرض؛ هنوز نظری ثبت نشده است"
            }
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
            </svg>

            <strong>
              {ratingFormat.format(average)}
            </strong>

            <span>
              ({money(reviewCount)} امتیاز)
            </span>
          </div>

          {colors.length > 0 && (
            <div
              className={styles.colors}
              role="group"
              aria-label="رنگ‌های موجود محصول"
            >
              {colors.map((variant) => {
                const hex = /^#[0-9a-fA-F]{6}$/.test(
                  variant.color_hex || ""
                )
                  ? variant.color_hex
                  : "#dedbd7";

                return (
                  <button
                    type="button"
                    key={variant.id}
                    className={styles.swatch}
                    style={{ "--swatch": hex }}
                    aria-label={`نمایش رنگ ${variant.color}`}
                    aria-pressed={
                      selectedId !== null &&
                      String(selectedId) === String(variant.id)
                    }
                    title={variant.color}
                    onClick={() =>
                      setSelectedId((current) =>
                        String(current) === String(variant.id)
                          ? null
                          : variant.id
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.price}>
          <strong>{money(price)}</strong>
          <PriceUnit />
        </div>
      </div>
    </article>
  );
}