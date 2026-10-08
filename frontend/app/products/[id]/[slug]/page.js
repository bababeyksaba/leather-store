"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { api, money, imageUrl } from "../../../../lib/api";
import { useCart } from "../../../../components/cart-context";
import PriceUnit from "../../../../components/price-unit";
import FavoriteButton from "../../../../components/favorite-button";
import ReviewForm from "../../../../components/review-form";

const decimal = new Intl.NumberFormat("fa-IR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function Stars({ value = 0 }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));

  return (
    <span className="pd-stars" aria-hidden="true" dir="ltr">
      {[0, 1, 2, 3, 4].map((index) => (
        <span className="pd-star" key={index}>
          <svg viewBox="0 0 24 24">
            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
          </svg>

          <span
            className="pd-star-fill"
            style={{
              width: `${Math.max(
                0,
                Math.min(100, (rating - index) * 100)
              )}%`,
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
            </svg>
          </span>
        </span>
      ))}
    </span>
  );
}

function ProductPhoto({ src, alt }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <span className="pd-photo-placeholder">
        تصویر موجود نیست
      </span>
    );
  }

  return (
    <img
      src={imageUrl(src)}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!id) return;

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
      <section className="pd-empty">
        <h1>دریافت محصول ناموفق بود</h1>
        <p role="alert">{error}</p>

        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
        >
          تلاش دوباره
        </button>

        <Link href="/">بازگشت به فروشگاه</Link>
      </section>
    );
  }

  if (!product) {
    return <p className="pd-empty">در حال دریافت محصول…</p>;
  }

  return (
    <ProductDetails
      key={`${product.id}-${retry}`}
      product={product}
      onReload={() => setRetry((value) => value + 1)}
    />
  );
}

function ProductDetails({ product, onReload }) {
  const { cart, add, busy } = useCart();

  const variants = (product.variants || []).filter(
    (item) => item.is_active !== false
  );

  const firstVariant =
    variants.find((item) => Number(item.stock) > 0) ||
    variants[0];

  const [variantId, setVariantId] = useState(
    firstVariant?.id ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [tab, setTab] = useState("description");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const variant = variants.find(
    (item) => String(item.id) === String(variantId)
  );

  const price = variant?.price ?? product.price;

  // موجودی رنگ انتخاب‌شده از API.
  const stock = Math.max(
    0,
    Number(variant?.stock ?? product.stock ?? 0) || 0
  );

  const selectedColor = variant?.color || product.color;
  const gallery = product.images || [];

  const selectedGallery = gallery.filter(
    (image) =>
      variantId !== null &&
      image.variant_id != null &&
      String(image.variant_id) === String(variantId)
  );

  const images = (
    variants.length
      ? [
          variant?.image,
          ...selectedGallery.map((image) => image.image),
        ]
      : [
          product.image,
          ...gallery.map((image) =>
            typeof image === "string" ? image : image.image
          ),
        ]
  ).filter(
    (image, index, list) =>
      image && list.indexOf(image) === index
  );

  const currentImage = images[selectedImage] || images[0];

  const colors = [
    ...new Set(
      variants.map((item) => item.color || "رنگ اصلی")
    ),
  ].map((color) => {
    const matching = variants.filter(
      (item) => (item.color || "رنگ اصلی") === color
    );

    const option =
      matching.find((item) => Number(item.stock) > 0) ||
      matching[0];

    const galleryImage = gallery.find(
      (image) =>
        image.variant_id != null &&
        String(image.variant_id) === String(option.id)
    );

    return {
      color,
      variant: option,
      image: option.image || galleryImage?.image,
    };
  });

  const inCart = (cart?.items || [])
    .filter((item) => {
      if (Number(item.product_id) !== Number(product.id)) {
        return false;
      }

      return variantId === null
        ? item.variant_id == null
        : String(item.variant_id) === String(variantId);
    })
    .reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );

  const maxQuantity = Math.max(0, stock - inCart);
  const value = Number(quantity);

  const available =
    product.is_active !== false && stock > 0;

  const valid =
    Number.isInteger(value) &&
    value >= 1 &&
    value <= maxQuantity;

  const reviews = (product.reviews || []).filter(
    (review) => review.is_approved !== false
  );

  const reviewCount = Number(
    product.review_count ?? reviews.length
  );

  const reviewAverage = reviews.length
    ? reviews.reduce(
        (total, review) => total + Number(review.rating || 0),
        0
      ) / reviews.length
    : 0;

  const suppliedRating = Number(
    product.average_rating ?? reviewAverage
  );

  const rating = reviewCount > 0
    ? Math.max(
        0,
        Math.min(
          5,
          Number.isFinite(suppliedRating) ? suppliedRating : 0
        )
      )
    : 0;

  const specs = [
    ["جنس", product.material],
    ["رنگ", selectedColor],
    ["ابعاد", product.dimensions],
    ["کد محصول", product.sku],
  ].filter(
    ([, content]) =>
      content != null && String(content).trim() !== ""
  );

  const buyLabel = busy
    ? "در حال ثبت…"
    : !available
      ? "ناموجود"
      : maxQuantity === 0
        ? "موجودی در سبد شماست"
        : "افزودن به سبد خرید";

  function selectColor(option) {
    setVariantId(option.variant.id);
    setQuantity(1);
    setSelectedImage(0);
    setNotice("");
    setError("");
  }

  function moveZoom(event) {
    const rect = event.currentTarget.getBoundingClientRect();

    event.currentTarget.style.setProperty(
      "--zoom-origin",
      `${((event.clientX - rect.left) / rect.width) * 100}% ${
        ((event.clientY - rect.top) / rect.height) * 100
      }%`
    );
  }

  async function submit(event) {
    event.preventDefault();

    if (!available || !valid || busy) return;

    setError("");
    setNotice("");

    try {
      await add(product.id, value, variantId ?? undefined);
      setNotice("محصول به سبد خرید اضافه شد.");
      setQuantity(1);
    } catch (err) {
      setError(err.message);
    }
  }

  function quantityControl(label) {
    return (
      <div className="pd-quantity" dir="ltr">
        <button
          type="button"
          aria-label="کاهش تعداد"
          disabled={
            busy || !available || maxQuantity === 0 || value <= 1
          }
          onClick={() =>
            setQuantity(Math.max(1, (Number(quantity) || 1) - 1))
          }
        >
          −
        </button>

        <input
          type="number"
          aria-label={label}
          min="1"
          max={Math.max(1, maxQuantity)}
          step="1"
          value={quantity}
          disabled={busy || !available || maxQuantity === 0}
          onChange={(event) => setQuantity(event.target.value)}
        />

        <button
          type="button"
          aria-label="افزایش تعداد"
          disabled={
            busy ||
            !available ||
            maxQuantity === 0 ||
            value >= maxQuantity
          }
          onClick={() =>
            setQuantity(
              Math.min(maxQuantity, (Number(quantity) || 1) + 1)
            )
          }
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className="pd-page">
      <nav className="pd-breadcrumbs" aria-label="مسیر صفحه">
        <Link href="/">خانه</Link>
        <span>/</span>

        {product.category_slug && (
          <>
            <Link
              href={`/?category=${encodeURIComponent(
                product.category_slug
              )}#catalog`}
            >
              {product.category_name}
            </Link>
            <span>/</span>
          </>
        )}

        <span>{product.name}</span>
      </nav>

      <div className="pd-top">
        <section
          className={`pd-gallery ${
            images.length > 1 ? "has-thumbs" : ""
          }`}
          aria-label="تصاویر محصول"
        >
          <div className="pd-main-photo">
            <FavoriteButton productId={product.id} compact />

            {currentImage ? (
              <div
                className="pd-image-hover"
                onMouseMove={moveZoom}
                onMouseLeave={(event) =>
                  event.currentTarget.style.setProperty(
                    "--zoom-origin",
                    "50% 50%"
                  )
                }
              >
                <ProductPhoto
                  src={currentImage}
                  alt={`${product.name}${
                    selectedColor ? `، رنگ ${selectedColor}` : ""
                  }`}
                />
              </div>
            ) : (
              <span className="pd-photo-placeholder">
                تصویر این رنگ هنوز ثبت نشده است.
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="pd-thumbs">
              {images.map((image, index) => (
                <button
                  type="button"
                  key={image}
                  aria-label={`نمایش تصویر ${money(index + 1)}`}
                  aria-pressed={selectedImage === index}
                  onClick={() => setSelectedImage(index)}
                >
                  <ProductPhoto
                    src={image}
                    alt={`${product.name}، تصویر ${index + 1}`}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="pd-summary">
          {product.category_name && (
            <Link
              className="pd-category"
              href={`/?category=${encodeURIComponent(
                product.category_slug || ""
              )}#catalog`}
            >
              {product.category_name}
            </Link>
          )}

          <h1>{product.name}</h1>

          <div className="pd-meta">
            <p className="pd-sku">
              کد محصول:
              <span dir="ltr">{product.sku || "—"}</span>
            </p>

            <a className="pd-rating" href="#product-reviews">
              <Stars value={rating} />

              <span className="pd-rating-number">
                {reviewCount > 0 ? decimal.format(rating) : "—"}
                <small> / ۵</small>
              </span>

              <small>({money(reviewCount)} نظر)</small>
            </a>
          </div>

          <div className="pd-color-section">
            <p className="pd-color-title">
              انتخاب رنگ
              {selectedColor && <strong>{selectedColor}</strong>}
            </p>

            {colors.length > 0 ? (
              <div className="pd-color-options">
                {colors.map((option) => (
                  <button
                    type="button"
                    className="pd-color-option"
                    key={option.color}
                    disabled={busy}
                    aria-label={`انتخاب رنگ ${option.color}`}
                    aria-pressed={
                      String(variantId) === String(option.variant.id)
                    }
                    onClick={() => selectColor(option)}
                  >
                    <span className="pd-color-photo">
                      <ProductPhoto
                        src={option.image}
                        alt={`رنگ ${option.color}`}
                      />
                    </span>

                    <span>{option.color}</span>

                    {Number(option.variant.stock) <= 0 && (
                      <small>ناموجود</small>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="pd-muted">
                {product.color || "رنگ محصول ثبت نشده است."}
              </p>
            )}

            {/* با تغییر رنگ، موجودی همین بخش تغییر می‌کند. */}
            <p
              aria-live="polite"
              aria-atomic="true"
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "6px",
                margin: "16px 0 0",
                fontSize: "13px",
                lineHeight: 1.8,
                color: available ? "#54735a" : "#a46b57",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "currentColor",
                }}
              />

              {available ? (
                <>
                  موجودی{selectedColor ? ` رنگ ${selectedColor}` : ""}:
                  <strong>{money(stock)} عدد</strong>
                </>
              ) : (
                <span>
                  {selectedColor
                    ? `رنگ ${selectedColor} ناموجود است.`
                    : "این محصول ناموجود است."}
                </span>
              )}
            </p>
          </div>

          <form className="pd-purchase" onSubmit={submit}>
            <div className="pd-purchase-line">
              <div>
                <label>تعداد</label>
                {quantityControl("تعداد محصول")}
              </div>

              <div className="pd-price">
                <strong>{money(price)}</strong>
                <PriceUnit />
              </div>
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
              {money(inCart)} عدد از این محصول
              {selectedColor ? ` با رنگ ${selectedColor}` : ""}
              {" "}در سبد شماست.
            </p>
          )}

          <div aria-live="polite">
            {notice && (
              <p className="pd-success">
                {notice}
                <Link href="/cart">مشاهدهٔ سبد خرید</Link>
              </p>
            )}

            {error && (
              <p className="error" role="alert">{error}</p>
            )}
          </div>
        </section>
      </div>

      <section className="pd-information">
        <div
          className="pd-tabs"
          role="tablist"
          aria-label="اطلاعات محصول"
        >
          <button
            type="button"
            role="tab"
            id="pd-description-tab"
            aria-selected={tab === "description"}
            aria-controls="pd-description-panel"
            onClick={() => setTab("description")}
          >
            توضیحات و مشخصات
          </button>

          <button
            type="button"
            role="tab"
            id="pd-care-tab"
            aria-selected={tab === "care"}
            aria-controls="pd-care-panel"
            onClick={() => setTab("care")}
          >
            نحوهٔ نگهداری
          </button>
        </div>

        {tab === "description" ? (
          <div
            className="pd-panel"
            id="pd-description-panel"
            role="tabpanel"
            aria-labelledby="pd-description-tab"
          >
            <h2>توضیحات محصول</h2>

            <p className="preserve-lines">
              {product.description ||
                "توضیحات این محصول هنوز ثبت نشده است."}
            </p>

            {specs.length > 0 && (
              <div className="pd-specs">
                <h2>مشخصات محصول</h2>

                <dl>
                  {specs.map(([label, content]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{content}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        ) : (
          <div
            className="pd-panel"
            id="pd-care-panel"
            role="tabpanel"
            aria-labelledby="pd-care-tab"
          >
            <h2>نحوهٔ نگهداری</h2>

            <p className="preserve-lines">
              {product.care_instructions ||
                "راهنمای نگهداری این محصول هنوز ثبت نشده است."}
            </p>
          </div>
        )}
      </section>

      <section className="pd-reviews" id="product-reviews">
        <div className="pd-reviews-title">
          <div className="pd-reviews-heading">
            <span className="pd-section-label">
              تجربهٔ خریداران
            </span>

            <h2>نظرات و امتیازها</h2>

            <p>
              {reviewCount > 0
                ? `${money(reviewCount)} نظر دربارهٔ این محصول`
                : "اولین نظر را شما بنویسید"}
            </p>
          </div>

          <div className="pd-score-card">
            <div className="pd-score-number">
              <strong>
                {reviewCount > 0 ? decimal.format(rating) : "—"}
              </strong>
              <span>از ۵</span>
            </div>

            <div className="pd-score-details">
              <Stars value={rating} />

              <span>
                {reviewCount > 0
                  ? `بر اساس ${money(reviewCount)} نظر`
                  : "هنوز امتیازی ثبت نشده"}
              </span>
            </div>
          </div>
        </div>

        <div className="pd-reviews-layout">
          <div className="pd-review-list">
            {reviews.length > 0 ? (
              reviews.map((review) => {
                const author =
                  (typeof review.author === "string"
                    ? review.author
                    : review.author_name) || "کاربر فروشگاه";

                const date = review.created_at
                  ? new Date(review.created_at)
                  : null;

                return (
                  <article className="pd-review" key={review.id}>
                    <div className="pd-review-heading">
                      <div className="pd-review-author">
                        <span className="pd-avatar" aria-hidden="true">
                          {author.trim().charAt(0)}
                        </span>

                        <div>
                          <strong>{author}</strong>

                          {date && !Number.isNaN(date.getTime()) && (
                            <time dateTime={review.created_at}>
                              {date.toLocaleDateString("fa-IR")}
                            </time>
                          )}
                        </div>
                      </div>

                      <div className="pd-review-rating">
                        <Stars value={review.rating} />
                        <span>{money(review.rating)} از ۵</span>
                      </div>
                    </div>

                    {review.title && <h3>{review.title}</h3>}

                    <p className="preserve-lines">
                      {review.comment || review.text}
                    </p>
                  </article>
                );
              })
            ) : (
              <div className="pd-no-reviews">
                <Stars value={0} />
                <h3>نظر شما ارزشمند است</h3>

                <p>
                  تجربهٔ خود از این محصول را با دیگران
                  به اشتراک بگذارید.
                </p>
              </div>
            )}
          </div>

          <div className="pd-review-form">
            <ReviewForm
              productId={product.id}
              onSaved={onReload}
            />
          </div>
        </div>
      </section>

      <form className="pd-sticky" onSubmit={submit}>
        <button
          type="submit"
          className="pd-buy"
          disabled={busy || !available || !valid}
        >
          {buyLabel}
        </button>

        {quantityControl("تعداد محصول در نوار خرید")}

        <div className="pd-sticky-name">
          <strong>{product.name}</strong>
          <span>{money(price)} <PriceUnit /></span>
        </div>
      </form>
    </div>
  );
}