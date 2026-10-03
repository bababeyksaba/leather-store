"use client";
import PriceUnit from "../components/price-unit";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, money, imageUrl } from "../lib/api";
import { useCart } from "../components/cart-context";
import CategoryMenu from "../components/category-menu";
import ProductCard from "../components/product-card";

const emptyFilters = { search: "", material: "", color: "", size: "", min_price: "", max_price: "", ordering: "-created_at", available: false };
export default function Products() {
  const [products, setProducts] = useState([]), [loading, setLoading] = useState(true);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [form, setForm] = useState(emptyFilters), [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1), [hasNext, setHasNext] = useState(false);
  const [options, setOptions] = useState({ colors: [], sizes: [], materials: [] });
  const [category, setCategory] = useState({ slug: "", title: "همهٔ محصولات" });
  const { cart, add, busy } = useCart();
  useEffect(() => { api("products/filters/").then(setOptions).catch(() => {}); }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(page) });
    Object.entries(filters).forEach(([key, value]) => { if (value !== "" && value !== false) params.set(key, String(value)); });
    if (category.slug) params.set("category", category.slug);
    api(`products/?${params}`).then(data => {
      if (!active) return;
      setProducts(Array.isArray(data) ? data : data.results ?? []);
      setHasNext(Boolean(data.next));
    }).catch(e => { if (active) { setError(e.message); setProducts([]); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, page, category.slug]);
  function change(e) { setForm(old => ({ ...old, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value })); }
  function apply(e) { e.preventDefault(); setPage(1); setFilters({ ...form, search: form.search.trim() }); }
  async function addProduct(product, variantId, quantity) {
    setNotice(""); setError("");
    try { await add(product.id, quantity, variantId); setNotice(`${money(quantity)} عدد از «${product.name}» به سبد خرید اضافه شد.`); }
    catch (e) { setError(e.message); }
  }
  function reset() { setForm(emptyFilters); setFilters(emptyFilters); setPage(1); }
  return <>
    <CategoryMenu selectedSlug={category.slug} onSelect={value => { setCategory(value); setPage(1); }} />
    <section className="hero"><p className="eyebrow">فروشگاه محصولات چرمی</p><h1>چرم، همراهِ روزهای شما</h1><p>رنگ و سایز دلخواهتان را انتخاب کنید.</p></section>
    <form className="catalog-filters" onSubmit={apply}>
      <label className="filter-search">جستجو<input type="search" name="search" value={form.search} onChange={change} maxLength={100} placeholder="نام، جنس، رنگ یا دسته‌بندی…" /></label>
      {[["material", "جنس", options.materials], ["color", "رنگ", options.colors], ["size", "سایز", options.sizes]].map(([key, label, values]) => <label key={key}>{label}<select name={key} value={form[key]} onChange={change}><option value="">همه</option>{values.map(v => <option key={v} value={v}>{v}</option>)}</select></label>)}
      <label>حداقل قیمت<input type="number" min="0" step="1" name="min_price" value={form.min_price} onChange={change} /></label>
      <label>حداکثر قیمت<input type="number" min="0" step="1" name="max_price" value={form.max_price} onChange={change} /></label>
      <label>مرتب‌سازی<select name="ordering" value={form.ordering} onChange={change}><option value="-created_at">جدیدترین</option><option value="created_at">قدیمی‌ترین</option><option value="price">ارزان‌ترین</option><option value="-price">گران‌ترین</option></select></label>
      <label className="checkbox-label"><input type="checkbox" name="available" checked={form.available} onChange={change} />فقط موجودها</label>
      <button type="submit">اعمال فیلتر</button><button type="button" className="plain-button" onClick={reset}>پاک کردن فیلترها</button>
    </form>
    {category.slug && <div className="selected-category"><h2>{category.title}</h2><button onClick={() => { setCategory({ slug: "", title: "همهٔ محصولات" }); setPage(1); }}>همهٔ محصولات ×</button></div>}
    <div aria-live="polite">{notice && <p className="success">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}</div>
    {loading ? <p>در حال دریافت محصولات…</p> : <>
      <div className="grid compact-products luxury-products">{products.map(product => <ProductCard key={product.id} product={product} cart={cart} busy={busy} onAdd={(id, quantity) => addProduct(product, id, quantity)} />)}</div>
      {!products.length && !error && <p className="empty">محصولی با این مشخصات پیدا نشد.</p>}
      {(hasNext || page > 1) && <div className="pagination"><button disabled={page === 1} onClick={() => setPage(v => v - 1)}>صفحهٔ قبل</button><span>صفحهٔ {money(page)}</span><button disabled={!hasNext} onClick={() => setPage(v => v + 1)}>صفحهٔ بعد</button></div>}
    </>}
  </>;
}