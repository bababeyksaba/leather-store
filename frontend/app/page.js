"use client";

import { useEffect, useState } from "react";
import { api, money, imageUrl } from "../lib/api";
import { useCart } from "../components/cart-context";
import ProductCard from "../components/product-card";

const emptyFilters = {
  search: "",
  material: "",
  color: "",
  min_price: "",
  max_price: "",
  ordering: "-created_at",
  available: false,
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);

  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const [options, setOptions] = useState({
    colors: [],
    materials: [],
  });

  const [category, setCategory] = useState({
    slug: "",
    title: "همهٔ محصولات",
  });

  const [groups, setGroups] = useState([]);

  const { cart, add, busy } = useCart();

  useEffect(() => {
    let active = true;

    api("menu/categories/")
      .then((data) => {
        if (!active) return;

        setGroups(
          Array.isArray(data) ? data : data.results ?? []
        );
      })
      .catch(() => {});

    function selectCategory(event) {
      setCategory(event.detail);
      setPage(1);

      document.getElementById("catalog")?.scrollIntoView({
        behavior: "smooth",
      });
    }

    const slug = new URLSearchParams(
      window.location.search
    ).get("category");

    if (slug) {
      setCategory({
        slug,
        title: "محصولات دسته‌بندی",
      });
    }

    window.addEventListener(
      "catalog-category",
      selectCategory
    );

    return () => {
      active = false;

      window.removeEventListener(
        "catalog-category",
        selectCategory
      );
    };
  }, []);

  useEffect(() => {
    let active = true;

    api("products/filters/")
      .then((data) => {
        if (active) setOptions(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      page: String(page),
    });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== false) {
        params.set(key, String(value));
      }
    });

    if (category.slug) {
      params.set("category", category.slug);
    }

    api(`products/?${params}`)
      .then((data) => {
        if (!active) return;

        setProducts(
          Array.isArray(data) ? data : data.results ?? []
        );

        setHasNext(Boolean(data.next));
      })
      .catch((err) => {
        if (!active) return;

        setError(err.message);
        setProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, page, category.slug]);

  const featuredCategories = groups
    .flatMap((group) =>
      group.children?.length ? group.children : [group]
    )
    .slice(0, 4);

  function chooseCategory(item) {
    setCategory({
      slug: item.slug,
      title: item.name,
    });

    setPage(1);

    document.getElementById("catalog")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  function change(event) {
    const { name, type, checked, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function apply(event) {
    event.preventDefault();

    setPage(1);

    setFilters({
      ...form,
      search: form.search.trim(),
    });
  }

  function reset() {
    setForm(emptyFilters);
    setFilters(emptyFilters);
    setPage(1);
  }

  function showAllProducts() {
    setCategory({
      slug: "",
      title: "همهٔ محصولات",
    });

    reset();
  }

  async function addProduct(product, variantId, quantity) {
    setNotice("");
    setError("");

    try {
      await add(product.id, quantity, variantId);

      setNotice(
        `${money(quantity)} عدد از «${product.name}» به سبد خرید اضافه شد.`
      );
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="boutique-home">
      <section
        className="boutique-hero"
        aria-label="مجموعه‌های فروشگاه"
      >
        <div className="boutique-main-banner">
          <img
            src="/images/home/hero.png"
            alt="کیف چرمی قهوه‌ای"
            fetchPriority="high"
          />

          <div className="boutique-hero-copy">
            <p>فروشگاه محصولات چرمی</p>

            <h1>زیبایی در جزئیات</h1>

            <p>چرم، همراهِ روزهای شما</p>

            <a className="boutique-cta" href="#catalog">
              مشاهدهٔ محصولات ←
            </a>
          </div>
        </div>

        <div className="boutique-side-banners">
          <a
            href="#catalog"
            className="boutique-small-banner"
          >
            <img
              src="/images/home/wallet.png"
              alt="کیف پول چرمی زرشکی"
            />

            <div>
              <h2>جزئیات ماندگار</h2>
              <p>انتخابی برای هر روز</p>
              <span>مشاهدهٔ محصولات ←</span>
            </div>
          </a>

          <a
            href="#catalog"
            className="boutique-small-banner"
          >
            <img
              src="/images/home/crossbody.png"
              alt="کیف دوشی چرمی مشکی"
            />

            <div>
              <h2>همراهِ روزهای شما</h2>
              <p>سبک و کاربردی</p>
              <span>مشاهدهٔ محصولات ←</span>
            </div>
          </a>
        </div>
      </section>

      {featuredCategories.length > 0 && (
        <section
          className="boutique-categories"
          aria-label="انتخاب دسته‌بندی"
        >
          {featuredCategories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => chooseCategory(item)}
            >
              <div>
                <h2>{item.name}</h2>
                <span>مشاهده ←</span>
              </div>

              {item.image ? (
                <img
                  src={imageUrl(item.image)}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <span
                  className="boutique-category-symbol"
                  aria-hidden="true"
                >
                  ◇
                </span>
              )}
            </button>
          ))}
        </section>
      )}

      <section
        id="catalog"
        className="boutique-catalog"
      >
        <div className="boutique-section-title">
          <h2>
            {category.slug
              ? category.title
              : "محصولات منتخب"}
          </h2>

          <span aria-hidden="true" />

          <button
            type="button"
            onClick={showAllProducts}
          >
            مشاهدهٔ همهٔ محصولات ←
          </button>
        </div>

        <details className="boutique-filter-panel">
          <summary>جستجو و فیلتر محصولات</summary>

          <form
            className="catalog-filters"
            onSubmit={apply}
          >
            <label className="filter-search">
              جستجو

              <input
                type="search"
                name="search"
                value={form.search}
                onChange={change}
                maxLength={100}
                placeholder="نام، جنس، رنگ یا دسته‌بندی…"
              />
            </label>

            {[
              ["material", "جنس", options.materials],
              ["color", "رنگ", options.colors],
            ].map(([key, label, values]) => (
              <label key={key}>
                {label}

                <select
                  name={key}
                  value={form[key]}
                  onChange={change}
                >
                  <option value="">همه</option>

                  {(values ?? []).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <label>
              حداقل قیمت

              <input
                type="number"
                min="0"
                step="1"
                name="min_price"
                value={form.min_price}
                onChange={change}
              />
            </label>

            <label>
              حداکثر قیمت

              <input
                type="number"
                min="0"
                step="1"
                name="max_price"
                value={form.max_price}
                onChange={change}
              />
            </label>

            <label>
              مرتب‌سازی

              <select
                name="ordering"
                value={form.ordering}
                onChange={change}
              >
                <option value="-created_at">
                  جدیدترین
                </option>

                <option value="created_at">
                  قدیمی‌ترین
                </option>

                <option value="price">
                  ارزان‌ترین
                </option>

                <option value="-price">
                  گران‌ترین
                </option>
              </select>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                name="available"
                checked={form.available}
                onChange={change}
              />

              فقط موجودها
            </label>

            <button type="submit">
              اعمال فیلتر
            </button>

            <button
              type="button"
              className="plain-button"
              onClick={reset}
            >
              پاک کردن فیلترها
            </button>
          </form>
        </details>

        {category.slug && (
          <div className="selected-category">
            <h2>{category.title}</h2>

            <button
              type="button"
              onClick={showAllProducts}
            >
              همهٔ محصولات ×
            </button>
          </div>
        )}

        <div aria-live="polite">
          {notice && (
            <p className="success">{notice}</p>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>

        {loading ? (
          <p role="status">
            در حال دریافت محصولات…
          </p>
        ) : (
          <>
            <div className="grid compact-products luxury-products">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cart={cart}
                  busy={busy}
                  onAdd={(variantId, quantity) =>
                    addProduct(
                      product,
                      variantId,
                      quantity
                    )
                  }
                />
              ))}
            </div>

            {!products.length && !error && (
              <p className="empty">
                محصولی با این مشخصات پیدا نشد.
              </p>
            )}

            {(hasNext || page > 1) && (
              <div className="pagination">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() =>
                    setPage((value) => value - 1)
                  }
                >
                  صفحهٔ قبل
                </button>

                <span>صفحهٔ {money(page)}</span>

                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() =>
                    setPage((value) => value + 1)
                  }
                >
                  صفحهٔ بعد
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}