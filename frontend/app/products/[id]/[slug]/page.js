"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { api, money, imageUrl } from "../../../../lib/api";
import { useCart } from "../../../../components/cart-context";
import PriceUnit from "../../../../components/price-unit";
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

        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
        >
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
      onReload={() => setRetry((value) => value + 1)}
    />
  );
}

function ProductDetails({ product, onReload }) {
  const { add, busy, cart } = useCart();

  const variants = product.variants || [];

  const [variantId, setVariantId] = useState(
    variants.find((item) => item.stock > 0)?.id ??
      variants[0]?.id
  );

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [failedImages, setFailedImages] = useState([]);
  const [tab, setTab] = useState("description");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const variant = variants.find(
    (item) => item.id === variantId
  );

  const images = [
    ...new Set(
      [
        variant?.image,
        product.image,
        ...(product.images || []).map((item) =>
          typeof item === "string" ? item : item.image
        ),
      ].filter(Boolean)
    ),
  ];

  const currentImage = images[selectedImage] || images[0];
  const reviews = product.reviews || [];
  const rating = product.average_rating;
  const count = product.review_count ?? reviews.length;

  const inCart = (cart?.items || [])
    .filter(
      (item) =>
        String(item.product_id) === String(product.id) &&
        String(item.variant_id) === String(variantId)
    )
    .reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );

  const max = Math.max(
    0,
    Math.min(
      Number(variant?.stock || 0) - inCart,
      10000 - inCart
    )
  );

  const value = Number(quantity);

  const valid =
    Number.isInteger(value) &&
    value >= 1 &&
    value <= max;

  const available =
    Number(variant?.stock || 0) > 0 &&
    product.is_active !== false;

  const specs = [
    ["جنس", product.material],
    ["رنگ", variant?.color || product.color],
    ["ابعاد", product.dimensions],
    ["کد محصول", variant?.sku || product.sku],
  ];

  const colors = [
    ...new Set(variants.map((item) => item.color)),
  ];

  const buyLabel = busy
    ? "در حال ثبت…"
    : !available
      ? "ناموجود"
      : max === 0
        ? "تمام موجودی در سبد شماست"
        : "افزودن به سبد خرید";

  const ratingText =
    rating == null
      ? "بدون امتیاز"
      : `${money(Number(rating).toFixed(1))} از ۵`;

  async function submit(event) {
    event.preventDefault();

    if (!valid || !available || busy) return;

    setError("");
    setNotice("");

    try {
      await add(product.id, value, variantId);
      setNotice("محصول به سبد خرید اضافه شد.");
    } catch (err) {
      setError(err.message);
    }
  }

  function moveZoom(event) {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const x = Math.max(
      0,
      Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)
    );

    const y = Math.max(
      0,
      Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)
    );

    element.style.setProperty("--zoom-origin", `${x}% ${y}%`);
  }

  function resetZoom(event) {
    event.currentTarget.style.setProperty(
      "--zoom-origin",
      "50% 50%"
    );
  }

  function quantityControl(suffix) {
    return (
      <div className="pd-quantity" dir="ltr">
        <button
          type="button"
          aria-label="کاهش تعداد"
          disabled={busy || !available || value <= 1}
          onClick={() => setQuantity(Math.max(1, value - 1))}
        >
          −
        </button>

        <input
          id={`pd-quantity-${suffix}`}
          aria-label="تعداد محصول"
          type="number"
          min="1"
          max={max || 1}
          step="1"
          value={quantity}
          disabled={busy || !available || max === 0}
          onChange={(event) => setQuantity(event.target.value)}
        />

        <button
          type="button"
          aria-label="افزایش تعداد"
          disabled={
            busy || !available || !valid || value >= max
          }
          onClick={() => setQuantity(value + 1)}
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className="pd-page">
      <div className="pd-top">
        <section className="pd-gallery" aria-label="گالری محصول">
          <div className="pd-thumbs">
            {images.map((image, index) => (
              <button
                key={image}
                type="button"
                aria-label={`تصویر ${index + 1}`}
                aria-pressed={selectedImage === index}
                onClick={() => setSelectedImage(index)}
              >
                <img src={imageUrl(image)} alt="" />
              </button>
            ))}
          </div>

          <div className="pd-main-photo">
            <FavoriteButton productId={product.id} compact />

            {currentImage &&
            !failedImages.includes(currentImage) ? (
              <div
                key={currentImage}
                className="pd-image-hover"
                onMouseMove={moveZoom}
                onMouseLeave={resetZoom}
              >
                <img
                  src={imageUrl(currentImage)}
                  alt={product.name}
                  decoding="async"
                  onError={() =>
                    setFailedImages((items) =>
                      items.includes(currentImage)
                        ? items
                        : [...items, currentImage]
                    )
                  }
                />
              </div>
            ) : (
              <span className="pd-placeholder">
                تصویر محصول در دسترس نیست
              </span>
            )}
          </div>
        </section>

        <div className="pd-summary-column">
          <nav className="pd-breadcrumbs" aria-label="مسیر صفحه">
            <Link href="/">خانه</Link>
            <span>‹</span>

            <Link
              href={`/?category=${encodeURIComponent(
                product.category_slug || ""
              )}`}
            >
              {product.category_name || "محصولات"}
            </Link>

            <span>‹</span>
            <span>{product.name}</span>
          </nav>

          <section className="pd-summary">
            <h1>{product.name}</h1>

            <a className="pd-rating" href="#product-reviews">
              {ratingText}{" "}
              <small>({money(count)} امتیاز)</small>
            </a>

            <p className="pd-intro">
              {product.description ||
                "توضیحات این محصول هنوز ثبت نشده است."}
            </p>

            <div className="pd-colors">
              <strong>
                رنگ
                {variant?.color ? `: ${variant.color}` : ""}
              </strong>

              <div>
                {colors.map((color) => {
                  const choices = variants.filter(
                    (item) => item.color === color
                  );

                  const option =
                    choices.find((item) => item.stock > 0) ||
                    choices[0];

                  const hex = /^#[0-9a-f]{6}$/i.test(
                    option.color_hex || ""
                  )
                    ? option.color_hex
                    : "#dddddd";

                  return (
                    <button
                      key={color || "no-color"}
                      type="button"
                      className="pd-swatch"
                      style={{ "--swatch": hex }}
                      aria-label={color || "رنگ اصلی"}
                      title={color || "رنگ اصلی"}
                      aria-pressed={variant?.color === color}
                      disabled={busy}
                      onClick={() => {
                        setVariantId(option.id);
                        setQuantity(1);
                        setSelectedImage(0);
                        setNotice("");
                        setError("");
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <form onSubmit={submit}>
              <div className="pd-purchase-line">
                <div>
                  <label htmlFor="pd-quantity-main">
                    تعداد
                  </label>

                  {quantityControl("main")}
                </div>

                <strong className="pd-price">
                  {money(variant?.price ?? product.price)}{" "}
                  <small>
                    <PriceUnit />
                  </small>
                </strong>
              </div>

              <button
                type="submit"
                className="pd-buy"
                disabled={busy || !available || !valid}
              >
                {buyLabel}
              </button>
            </form>

            {inCart > 0 && (
              <p className="pd-muted">
                {money(inCart)} عدد از این رنگ در سبد شماست.
              </p>
            )}

            <div aria-live="polite">
              {notice && (
                <p className="success">
                  {notice}{" "}
                  <Link href="/cart">مشاهدهٔ سبد</Link>
                </p>
              )}

              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="pd-bottom">
        <section className="pd-information">
          <div
            className="pd-tabs"
            role="tablist"
            aria-label="اطلاعات محصول"
          >
            {[
              ["description", "توضیحات محصول"],
              ["care", "نحوهٔ نگهداری"],
            ].map(([key, title]) => (
              <button
                type="button"
                key={key}
                id={`pd-tab-${key}`}
                role="tab"
                aria-selected={tab === key}
                aria-controls="pd-panel"
                onClick={() => setTab(key)}
              >
                {title}
              </button>
            ))}
          </div>

          <div
            id="pd-panel"
            role="tabpanel"
            aria-labelledby={`pd-tab-${tab}`}
            className="pd-panel"
          >
            <p className="preserve-lines">
              {tab === "description"
                ? product.description || "توضیحات ثبت نشده است."
                : product.care_instructions ||
                  "راهنمای نگهداری ثبت نشده است."}
            </p>
          </div>

          <div className="pd-specs">
            <h2>مشخصات</h2>

            <dl>
              {specs
                .filter(([, text]) => text)
                .map(([label, text]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{text}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </section>

        <section id="product-reviews" className="pd-reviews">
          <div className="pd-reviews-title">
            <h2>نظرات و امتیازها</h2>

            <span>
              {ratingText}{" "}
              <small>({money(count)} امتیاز)</small>
            </span>
          </div>

          {reviews.length ? (
            reviews.map((review) => {
              const author =
                typeof review.author === "string"
                  ? review.author
                  : review.author_name || "کاربر";

              return (
                <article className="pd-review" key={review.id}>
                  <div className="pd-review-heading">
                    <span className="pd-avatar" aria-hidden="true">
                      {author.slice(0, 1)}
                    </span>

                    <div>
                      <strong>{author}</strong>

                      {review.created_at && (
                        <time dateTime={review.created_at}>
                          {new Date(
                            review.created_at
                          ).toLocaleDateString("fa-IR")}
                        </time>
                      )}
                    </div>

                    <span>{money(review.rating)} از ۵</span>
                  </div>

                  {review.title && <h3>{review.title}</h3>}

                  <p className="preserve-lines">
                    {review.comment || review.text}
                  </p>
                </article>
              );
            })
          ) : (
            <p className="pd-muted">هنوز نظری ثبت نشده است.</p>
          )}

          <ReviewForm
            productId={product.id}
            onSaved={onReload}
          />
        </section>
      </div>

      <form className="pd-sticky" onSubmit={submit}>
        <button
          type="submit"
          className="pd-buy"
          disabled={busy || !available || !valid}
        >
          {buyLabel}
        </button>

        {quantityControl("sticky")}

        <div className="pd-sticky-name">
          <strong>{product.name}</strong>

          <span>
            {money(variant?.price ?? product.price)}{" "}
            <PriceUnit />
          </span>
        </div>

        {currentImage && (
          <img src={imageUrl(currentImage)} alt="" />
        )}
      </form>
    </div>
  );
}