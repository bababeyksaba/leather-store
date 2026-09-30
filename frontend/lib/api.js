export async function api(path, options = {}) {
 const response = await fetch(`/api/${path}`, {credentials: "same-origin", cache: "no-store", ...options});
 const data = response.status === 204 ? null : await response.json().catch(() => null);
 if (!response.ok) {
  const message = data?.detail || (data?.quantity && [].concat(data.quantity).join(" ")) || "دریافت اطلاعات ناموفق بود. اتصال به Django را بررسی کنید.";
  throw new Error(message);
 }
 return data;
}
export const money = value => new Intl.NumberFormat("fa-IR", {maximumFractionDigits: 2}).format(Number(value));
export function imageUrl(value) {
 if (!value) return null;
 try { const url = new URL(value, "http://placeholder"); if (url.pathname.startsWith("/media/")) return `/api${url.pathname}${url.search}`; } catch {}
 return value;
}
