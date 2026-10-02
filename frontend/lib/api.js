function errorText(value) {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(errorText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value).map(errorText).join(" ");
  }

  return "";
}

export async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
  });

  const data =
    response.status === 204
      ? null
      : await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      errorText(data?.detail || data) ||
        "دریافت اطلاعات ناموفق بود. اتصال به Django را بررسی کنید."
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

export async function accountMutation(path, method, data) {
  const session = await api("auth/session/");

  return api(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": session.csrf_token,
    },
    ...(data === undefined
      ? {}
      : { body: JSON.stringify(data) }),
  });
}

export const money = (value) =>
  new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(Number(value));

export function imageUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value, "http://placeholder");

    if (url.pathname.startsWith("/media/")) {
      return `/api${url.pathname}${url.search}`;
    }
  } catch {}

  return value;
}

export function safeNext(value) {
  return value === "/checkout" ? "/checkout" : "/profile";
}