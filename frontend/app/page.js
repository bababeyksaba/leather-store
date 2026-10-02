"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api, money, imageUrl } from "../lib/api";
import { useCart } from "../components/cart-context";
import CategoryMenu from "../components/category-menu";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const [notice, setNotice] = useState("");

  const [category, setCategory] = useState({
    slug: "",
    title: "همهٔ محصولات",
  });

  const { cart, add, busy } = useCart();

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      search: query,
      page: String(page),
    });

    if (category.slug) {
      params.set("category", category.slug);
    }

    api(`products/?${params.toString()}`)
      .then((data) => {
        if (!active) return;

        setProducts(
          Array.isArray(data) ? data : data.results ?? []
        );

        setHasNext(
          !Array.isArray(data) && Boolean(data.next)
        );
      })
      .catch((err) => {
        if (!active) return;

        setProducts([]);
        setHasNext(false);
        setError(err.message);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [query, page, category.slug]);

  async function addProduct(product, quantity) {
    setNotice("");
    setError("");

    try {
      await add(product.id, quantity);

      setNotice(
        `${money(quantity)} عدد از «${product.name}» به سبد خرید اضافه شد.`
      );
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSearch(event) {
    event.preventDefault();

    setNotice("");
    setPage(1);
    setQuery(search.trim());
  }

  function selectCategory(nextCategory) {
    setCategory(nextCategory);

    setPage(1);
    setSearch("");
    setQuery("");

    setNotice("");
    setError("");
  }

  function showAllProducts() {
    selectCategory({
      slug: "",
      title: "همهٔ محصولات",
    });
  }

  return (
    <>
      <CategoryMenu
        selectedSlug={category.slug}
        onSelect={selectCategory}
      />

      <section className="hero">
        <p className="eyebrow">
          فروشگاه محصولات چرمی
        </p>

        <h1>چرم، همراهِ روزهای شما</h1>

        <p>
          محصولات را از منوی دسته‌بندی انتخاب کنید.
          برای مشاهدهٔ مشخصات و گالری تصاویر،
          روی تصویر یا نام محصول کلیک کنید.
        </p>
      </section>

      <form className="search" onSubmit={handleSearch}>
        <input
          type="search"
          aria-label="جستجوی محصول"
          placeholder={
            category.slug
              ? `جستجو در ${category.title}…`
              : "نام، جنس یا رنگ محصول…"
          }
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        <button type="submit">
          جستجو
        </button>
      </form>

      {category.slug && (
        <div className="selected-category">
          <h2>{category.title}</h2>

          <button
            type="button"
            onClick={showAllProducts}
          >
            نمایش همهٔ محصولات ×
          </button>
        </div>
      )}

      <div aria-live="polite">
        {notice && (
          <p className="success">
            {notice}
          </p>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>

      {loading ? (
        <p className="loading-state">
          در حال دریافت محصولات…
        </p>
      ) : (
        <>
          <div className="grid">
            {products.map((product) => {
              const cartItem = cart?.items?.find(
                (item) =>
                  String(item.product_id) ===
                  String(product.id)
              );

              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  busy={busy}
                  cartQuantity={
                    cartItem?.quantity ?? 0
                  }
                  onAdd={(quantity) =>
                    addProduct(product, quantity)
                  }
                />
              );
            })}
          </div>

          {!products.length && !error && (
            <div className="empty">
              <h2>محصولی پیدا نشد.</h2>

              <p>
                {category.slug
                  ? "در این دسته و با شرایط جستجوی فعلی، محصولی وجود ندارد."
                  : "عبارت جستجو را تغییر دهید یا محصولات را در پنل ادمین اضافه کنید."}
              </p>

              {(category.slug || query) && (
                <button
                  type="button"
                  onClick={showAllProducts}
                >
                  نمایش همهٔ محصولات
                </button>
              )}
            </div>
          )}

          {!error && (page > 1 || hasNext) && (
            <div className="pagination">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => {
                  setNotice("");
                  setPage((value) => value - 1);
                }}
              >
                صفحهٔ قبل
              </button>

              <span>
                صفحهٔ {money(page)}
              </span>

              <button
                type="button"
                disabled={!hasNext}
                onClick={() => {
                  setNotice("");
                  setPage((value) => value + 1);
                }}
              >
                صفحهٔ بعد
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function ProductCard({
  product,
  busy,
  cartQuantity,
  onAdd,
}) {
  const [quantity, setQuantity] = useState(1);

  const image = imageUrl(product.image);

  const stock = Number(product.stock);
  const inCart = Number(cartQuantity);

  const remaining = Math.max(
    0,
    stock - inCart
  );

  const maxQuantity = Math.max(
    0,
    Math.min(remaining, 10000 - inCart)
  );

  const available =
    stock > 0 &&
    product.is_active !== false &&
    product.is_available !== false;

  const value = Number(quantity);

  const valid =
    Number.isInteger(value) &&
    value >= 1 &&
    value <= maxQuantity;

  const href =
    `/products/${product.id}/` +
    `${encodeURIComponent(
      product.slug || "product"
    )}/`;

  return (
    <article className="product">
      <Link
        href={href}
        className="photo"
        aria-label={`مشاهدهٔ ${product.name}`}
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <span>تصویر محصول</span>
        )}
      </Link>

      <div className="product-body">
        <small>
          {product.category?.name ||
            product.material}
        </small>

        <h2>
          <Link href={href}>
            {product.name}
          </Link>
        </h2>

        <p>
          {money(product.price)}{" "}
          <small>واحد قیمت فروشگاه</small>
        </p>

        {inCart > 0 && (
          <p
            className="in-cart-count"
            aria-live="polite"
          >
            ✓ {money(inCart)} عدد در سبد خرید
          </p>
        )}

        <div className="actions">
          <input
            type="number"
            aria-label={`تعداد برای افزودن ${product.name}`}
            min="1"
            max={Math.max(1, maxQuantity)}
            step="1"
            value={quantity}
            disabled={
              busy ||
              !available ||
              maxQuantity < 1
            }
            onChange={(event) =>
              setQuantity(event.target.value)
            }
          />

          <button
            type="button"
            disabled={
              busy ||
              !available ||
              !valid
            }
            onClick={() => onAdd(value)}
          >
            {!available
              ? "ناموجود"
              : maxQuantity < 1
                ? "حداکثر تعداد در سبد"
                : "افزودن به سبد"}
          </button>
        </div>

        {available &&
          maxQuantity > 0 &&
          value > maxQuantity && (
            <p className="error">
              حداکثر {money(maxQuantity)} عدد دیگر
              می‌توانید اضافه کنید.
            </p>
          )}
      </div>
    </article>
  );
}