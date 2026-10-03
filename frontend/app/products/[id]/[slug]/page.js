"use client";

import PriceUnit from "../../../../components/price-unit";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import {
  api,
  money,
  imageUrl,
} from "../../../../lib/api";

import { useCart } from "../../../../components/cart-context";


import VariantPicker from "../../../../components/variant-picker";
import ReviewForm from "../../../../components/review-form";
import FavoriteButton from "../../../../components/favorite-button";

export default function ProductPage() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    setProduct(null);
    setError("");

    api(`products/id/${encodeURIComponent(id)}/`)
      .then((data) => {
        if (active) setProduct(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, [id, retry]);

  if (error) {
    return (
      <div className="detail-empty" role="alert">
        <h1>محصول دریافت نشد</h1>
        <p>{error}</p>

        <button onClick={() => setRetry((value) => value + 1)}>
          تلاش دوباره
        </button>

        <Link href="/">بازگشت به محصولات</Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="detail-empty" aria-live="polite">
        در حال دریافت اطلاعات محصول…
      </div>
    );
  }

  return (
    <ProductDetails
      key={product.id}
      product={product}
      onReload={() => setRetry(v => v + 1)}
    />
  );
}


function ProductDetails({ product, onReload }) {
  const { add, busy, cart } = useCart();
  const variants = product.variants || [];
  const [variantId, setVariantId] = useState(variants.find(v => v.stock > 0)?.id ?? variants[0]?.id);
  const variant = variants.find(v => v.id === variantId);
  const inCart = cart?.items?.find(i => i.variant_id === variantId)?.quantity || 0;

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState("description");
  const [zoom, setZoom] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const gallery = Array.isArray(product.images)
    ? product.images.map((item) =>
        typeof item === "string"
          ? item
          : item?.image || item?.url
      )
    : [];

  const images = [
    ...new Set(
      [variant?.image, product.image, ...gallery].filter(
        (value) => typeof value === "string" && value
      )
    ),
  ];

  const reviews = Array.isArray(product.reviews)
    ? product.reviews
    : [];

  const reviewCount = product.review_count ?? reviews.length;

  const averageRating =
    product.average_rating ??
    (reviews.length
      ? reviews.reduce(
          (sum, review) => sum + Number(review.rating || 0),
          0
        ) / reviews.length
      : null);

  const category =
    product.category_name ||
    product.category?.name ||
    "محصول چرمی";

  const value = Number(quantity);
  const maxQuantity = Math.max(0, Math.min((variant?.stock || 0) - inCart, 10000 - inCart));

  const available =
    variant?.stock > 0 &&
    product.is_active !== false;

  const validQuantity =
    Number.isInteger(value) &&
    value >= 1 &&
    value <= maxQuantity;

  const specifications = [
    ["جنس", product.material],
    ["رنگ", variant?.color],
    ["ابعاد", product.dimensions],
    ["اندازه", variant?.size],
    ["کد محصول", variant?.sku || product.sku],
  ];

  const tabs = [
    ["description", "توضیحات محصول"],
    ["specs", "مشخصات و اندازه"],
    ["care", "نحوهٔ نگهداری"],
    
  ];

  useEffect(() => {
    if (!zoom) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setZoom(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [zoom]);

  async function handleAddToCart(event) {
    event.preventDefault();

    if (!available || !validQuantity || busy) return;

    setNotice("");
    setError("");

    try {
      await add(product.id, value, variantId);
      setNotice("محصول به سبد خرید اضافه شد.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="product-detail">
      <nav className="breadcrumbs" aria-label="مسیر صفحه">
        <Link href="/">محصولات</Link>
        <span>/</span>
        <span>{category}</span>
        <span>/</span>
        <span>{product.name}</span>
      </nav>

      <div className="detail-grid">
        <section
          className="gallery"
          aria-label="گالری تصاویر محصول"
        >
          <div className="gallery-main">
            {images.length > 0 ? (
              <button
                type="button"
                className="image-open"
                aria-label="نمایش بزرگ تصویر"
                onClick={() => setZoom(true)}
              >
                <img
                  src={imageUrl(images[selectedImage])}
                  alt={`${product.name}، تصویر ${selectedImage + 1}`}
                />

                <span>برای بزرگ‌نمایی کلیک کنید ↗</span>
              </button>
            ) : (
              <p className="image-placeholder">
                تصویر این محصول ثبت نشده است.
              </p>
            )}
          </div>

          {images.length > 1 && (
            <div className="thumbnails">
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  aria-label={`نمایش تصویر ${index + 1}`}
                  aria-pressed={selectedImage === index}
                  onClick={() => setSelectedImage(index)}
                >
                  <img src={imageUrl(image)} alt="" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="detail-info">
          <p className="eyebrow">{category}</p>

          <h1>{product.name}</h1>

          <a
            href="#product-reviews"
            className="rating-line"
          >
            <span aria-hidden="true">★</span>

            {averageRating == null
              ? "هنوز امتیازی ثبت نشده"
              : `${money(Number(averageRating).toFixed(1))} از ۵`}

            <small>· {money(reviewCount)} نظر</small>
          </a>

          <div className="detail-price">
            {money(variant?.price ?? product.price)}
            <small><PriceUnit /></small>
          </div>

          <p className="availability">
            {available
              ? `موجود · ${money(variant?.stock ?? 0)} عدد`
              : "ناموجود"}
          </p>

          {product.description && (
            <p className="detail-intro">
              {product.description}
            </p>
          )}

          <VariantPicker variants={variants} value={variantId} disabled={busy} onChange={id => { setVariantId(id); setQuantity(1); setSelectedImage(0); }} />
          {inCart > 0 && <p className="in-cart-count">{money(inCart)} عدد از این رنگ و سایز در سبد شماست.</p>}
          <FavoriteButton productId={product.id} />
          <form
            className="purchase-form"
            onSubmit={handleAddToCart}
          >
            <label htmlFor="product-quantity">
              تعداد
            </label>

            <div className="purchase-row">
              <div className="quantity-control">
                <button
                  type="button"
                  aria-label="کاهش تعداد"
                  disabled={
                    busy ||
                    !available ||
                    !validQuantity ||
                    value <= 1
                  }
                  onClick={() => setQuantity(value - 1)}
                >
                  −
                </button>

                <input
                  id="product-quantity"
                  type="number"
                  min="1"
                  max={maxQuantity}
                  step="1"
                  required
                  value={quantity}
                  disabled={busy || !available}
                  onChange={(event) =>
                    setQuantity(event.target.value)
                  }
                />

                <button
                  type="button"
                  aria-label="افزایش تعداد"
                  disabled={
                    busy ||
                    !available ||
                    !validQuantity ||
                    value >= maxQuantity
                  }
                  onClick={() => setQuantity(value + 1)}
                >
                  +
                </button>
              </div>

              <button
                type="submit"
                className="add-to-cart"
                disabled={
                  busy || !available || !validQuantity
                }
              >
                {busy
                  ? "در حال ثبت…"
                  : available
                    ? "افزودن به سبد خرید"
                    : "ناموجود"}
              </button>
            </div>
          </form>

          <div aria-live="polite">
            {notice && (
              <p className="success">
                {notice}
                {" "}
                <Link href="/cart">
                  مشاهدهٔ سبد ←
                </Link>
              </p>
            )}

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>

          {product.sku && (
            <p className="sku">
              شناسهٔ محصول: <b>{product.sku}</b>
            </p>
          )}
        </section>
      </div>

      <section
        id="product-information"
        className="product-information"
      >
        <div
          className="detail-tabs"
          role="tablist"
          aria-label="اطلاعات محصول"
        >
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-${key}`}
              aria-selected={activeTab === key}
              aria-controls={`panel-${key}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className="detail-panel"
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === "description" && (
            <>
              <h2>دربارهٔ {product.name}</h2>

              <p className="preserve-lines">
                {product.description ||
                  "توضیحات این محصول هنوز ثبت نشده است."}
              </p>
            </>
          )}

          {activeTab === "specs" && (
            <>
              <h2>مشخصات محصول</h2>

              <dl className="spec-list">
                {specifications.map(([label, text]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{text || "ثبت نشده"}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          {activeTab === "care" && (
            <>
              <h2>نحوهٔ نگهداری</h2>

              <p className="preserve-lines">
                {product.care_instructions ||
                  "راهنمای نگهداری این محصول هنوز ثبت نشده است."}
              </p>
            </>
          )}


        </div>
      </section>

      <section id="product-reviews" className="product-reviews" aria-label="نظرات و امتیازها">

              <h2>نظرات و امتیازها</h2>

              {averageRating != null && (
                <p>
                  امتیاز میانگین:
                  {" "}
                  {money(Number(averageRating).toFixed(1))}
                  {" "}
                  از ۵
                </p>
              )}

              {reviews.length > 0 ? (
                reviews.map((review, index) => (
                  <article
                    className="review"
                    key={review.id ?? index}
                  >
                    <div>
                      <strong>
                        {typeof review.author === "string"
                          ? review.author
                          : review.author_name || "خریدار"}
                      </strong>

                      <span>
                        {money(review.rating)} از ۵
                      </span>
                    </div>

                    {review.title && (
                      <h3>{review.title}</h3>
                    )}

                    <p className="preserve-lines">
                      {review.comment || review.text}
                    </p>

                    {review.created_at && (
                      <time dateTime={review.created_at}>
                        {new Date(
                          review.created_at
                        ).toLocaleDateString("fa-IR")}
                      </time>
                    )}
                  </article>
                ))
              ) : (
                <p className="muted">
                  نظری برای نمایش موجود نیست.
                </p>
              )}

              <ReviewForm productId={product.id} onSaved={onReload} />

      </section>

      {zoom && (
        <div
          className="image-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="تصویر بزرگ محصول"
          onClick={() => setZoom(false)}
        >
          <button
            type="button"
            autoFocus
            className="close-zoom"
            onClick={() => setZoom(false)}
          >
            بستن ×
          </button>

          <img
            src={imageUrl(images[selectedImage])}
            alt={product.name}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
