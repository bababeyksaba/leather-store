"use client";

import { useEffect, useState } from "react";

import { api, money, imageUrl } from "../lib/api";
import { useCart } from "../components/cart-context";

import ProductCard from "../components/product-card";
import HomepageHero from "../components/homepage-hero";

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

  const [form, setForm] = useState({ ...emptyFilters });
  const [filters, setFilters] = useState({ ...emptyFilters });

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

  const [featuredCategories, setFeaturedCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [productRetry, setProductRetry] = useState(0);

  const { cart, add, busy } = useCart();

  useEffect(() => {
    function selectCategory(event) {
      const item = event.detail || {};

      setCategory({
        slug: item.slug || "",
        title: item.title || item.name || "محصولات دسته‌بندی",
      });

      setPage(1);
      setNotice("");

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

    window.addEventListener("catalog-category", selectCategory);

    return () => {
      window.removeEventListener("catalog-category", selectCategory);
    };
  }, []);

  useEffect(() => {
    let active = true;

    setCategoryError("");

    api("homepage/categories/")
      .then((data) => {
        if (!active) return;

        setFeaturedCategories(
          Array.isArray(data) ? data : data.results ?? []
        );
      })
      .catch((err) => {
        if (!active) return;

        setFeaturedCategories([]);

        setCategoryError(
          err.message || "دریافت دسته‌های صفحهٔ اصلی ناموفق بود."
        );
      });

    return () => {
      active = false;
    };
  }, [categoryRetry]);

  useEffect(() => {
    let active = true;

    api("products/filters/")
      .then((data) => {
        if (!active) return;

        setOptions({
          colors: data.colors ?? [],
          materials: data.materials ?? [],
        });
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

    api(`products/?${params.toString()}`)
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
        setHasNext(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, page, category.slug, productRetry]);

  function updateCategory(item) {
    const slug = item.slug || "";

    setCategory({
      slug,
      title: item.name || item.title || "همهٔ محصولات",
    });

    setPage(1);
    setNotice("");

    const url = new URL(window.location.href);

    if (slug) {
      url.searchParams.set("category", slug);
    } else {
      url.searchParams.delete("category");
    }

    url.hash = "catalog";

    window.history.replaceState(
      window.history.state,
      "",
      url.toString()
    );
  }

  function chooseCategory(item) {
    updateCategory(item);

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

  function changeQuickFilter(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPage(1);
    setNotice("");
  }

  function apply(event) {
    event.preventDefault();

    if (
      form.min_price !== "" &&
      form.max_price !== "" &&
      Number(form.min_price) > Number(form.max_price)
    ) {
      setError("حداقل قیمت نباید از حداکثر قیمت بیشتر باشد.");
      return;
    }

    setError("");
    setNotice("");
    setPage(1);

    setFilters({
      ...form,
      search: form.search.trim(),
    });
  }

  function reset() {
    setForm({ ...emptyFilters });
    setFilters({ ...emptyFilters });
    setPage(1);
    setError("");
    setNotice("");
  }

  function showAllProducts() {
    updateCategory({
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

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => value !== emptyFilters[key]
  );

  const selectedCategoryInList = featuredCategories.some(
    (item) => item.slug === category.slug
  );

  return (
    <div className="boutique-home">
      <HomepageHero />

      {categoryError && (
        <div className="error" role="alert">
          <p>{categoryError}</p>

          <button
            type="button"
            onClick={() => setCategoryRetry((value) => value + 1)}
          >
            تلاش دوباره
          </button>
        </div>
      )}

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
        className="handmade-story"
        aria-labelledby="handmade-title"
      >
        <div className="handmade-story-content">
          <span className="handmade-story-label">
            چرم طبیعی، دوخت دستی
          </span>

          <h2 id="handmade-title">
            با دست دوخته شده
          </h2>

          <p>
            هر محصول حاصل زمان، دقت و علاقه به چرم طبیعی است.
            از انتخاب چرم تا آخرین بخیه، جزئیات را با دست
            می‌سازیم تا همراهی زیبا و ماندگار برای روزهای شما باشد.
          </p>
        </div>

        <div className="handmade-story-photo">
          <img
            src="/images/home/handmade.jpg"
            alt="دوخت دستی محصول چرمی با نخ و سوزن"
            loading="lazy"
            width="900"
            height="600"
          />
        </div>
      </section>

      <section
        id="catalog"
        className="boutique-catalog"
        aria-labelledby="catalog-title"
      >
        <div className="boutique-section-title">
          <h2 id="catalog-title">
            {category.slug ? category.title : "محصولات منتخب"}
          </h2>

          <span aria-hidden="true" />

          <button
            type="button"
            onClick={showAllProducts}
          >
            مشاهدهٔ همهٔ محصولات ←
          </button>
        </div>

        <form
          className="catalog-search-form"
          onSubmit={apply}
          role="search"
        >
          <div className="catalog-toolbar">
            <div className="catalog-search-input">
              <button
                type="submit"
                aria-label="جستجوی محصولات"
                title="جستجو"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="10.5" cy="10.5" r="7" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
              </button>

              <input
                type="search"
                name="search"
                aria-label="جستجوی محصول"
                placeholder="جستجو در محصولات…"
                maxLength={100}
                value={form.search}
                onChange={change}
              />
            </div>

            <div className="catalog-quick-filters">
              <select
                aria-label="دسته‌بندی"
                value={category.slug}
                onChange={(event) => {
                  const slug = event.target.value;

                  const item = featuredCategories.find(
                    (entry) => entry.slug === slug
                  );

                  updateCategory({
                    slug,
                    title: item?.name || "همهٔ محصولات",
                  });
                }}
              >
                <option value="">دسته‌بندی: همه</option>

                {category.slug && !selectedCategoryInList && (
                  <option value={category.slug}>
                    {category.title}
                  </option>
                )}

                {featuredCategories.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                name="color"
                aria-label="رنگ محصول"
                value={form.color}
                onChange={changeQuickFilter}
              >
                <option value="">رنگ: همه</option>

                {options.colors.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>

              <select
                name="ordering"
                aria-label="مرتب‌سازی محصولات"
                value={form.ordering}
                onChange={changeQuickFilter}
              >
                <option value="-created_at">جدیدترین</option>
                <option value="created_at">قدیمی‌ترین</option>
                <option value="price">ارزان‌ترین</option>
                <option value="-price">گران‌ترین</option>
              </select>
            </div>
          </div>

          <details className="catalog-extra-filters">
            <summary>فیلترهای بیشتر</summary>

            <div className="catalog-extra-grid">
              <label>
                جنس محصول

                <select
                  name="material"
                  value={form.material}
                  onChange={change}
                >
                  <option value="">همهٔ جنس‌ها</option>

                  {options.materials.map((material) => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                حداقل قیمت

                <input
                  type="number"
                  name="min_price"
                  min="0"
                  step="1"
                  placeholder="از"
                  value={form.min_price}
                  onChange={change}
                />
              </label>

              <label>
                حداکثر قیمت

                <input
                  type="number"
                  name="max_price"
                  min="0"
                  step="1"
                  placeholder="تا"
                  value={form.max_price}
                  onChange={change}
                />
              </label>

              <label className="catalog-available">
                <input
                  type="checkbox"
                  name="available"
                  checked={form.available}
                  onChange={change}
                />

                فقط محصولات موجود
              </label>

              <button
                type="submit"
                className="catalog-apply-button"
              >
                اعمال فیلتر
              </button>

              <button
                type="button"
                className="catalog-reset-button"
                onClick={reset}
              >
                پاک کردن فیلترها
              </button>
            </div>
          </details>
        </form>

        {(category.slug || hasActiveFilters) && (
          <div className="catalog-active-filters">
            {category.slug && <span>{category.title}</span>}

            {filters.search && (
              <span>جستجو: {filters.search}</span>
            )}

            <button
              type="button"
              onClick={showAllProducts}
            >
              پاک کردن انتخاب‌ها ×
            </button>
          </div>
        )}

        <div aria-live="polite">
          {notice && <p className="success">{notice}</p>}

          {error && (
            <div className="error" role="alert">
              <p>{error}</p>

              <button
                type="button"
                onClick={() => setProductRetry((value) => value + 1)}
              >
                تلاش دوباره
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <p role="status">در حال دریافت محصولات…</p>
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
                    addProduct(product, variantId, quantity)
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
                  onClick={() => setPage((value) => value - 1)}
                >
                  صفحهٔ قبل
                </button>

                <span>صفحهٔ {money(page)}</span>

                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => setPage((value) => value + 1)}
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