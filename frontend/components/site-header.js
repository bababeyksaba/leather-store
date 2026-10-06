"use client";

import Link from "next/link";
import CategoryMenu from "./category-menu";
import { useAuth } from "./auth-context";

export default function SiteHeader() {
  const { session } = useAuth();
  const authenticated = session?.authenticated;

  function selectCategory(value) {
    if (window.location.pathname === "/") {
      window.dispatchEvent(
        new CustomEvent("catalog-category", {
          detail: value,
        })
      );

      return;
    }

    window.location.assign(
      value.slug
        ? `/?category=${encodeURIComponent(value.slug)}#catalog`
        : "/#catalog"
    );
  }

  return (
    <header className="boutique-header">
      <Link
        className="brand site-logo"
        href="/"
        aria-label="صفحهٔ اصلی فروشگاه"
      >
        <img
          src="/images/logo.png"
          alt="لوگوی فروشگاه"
          width={150}
          height={60}
        />
      </Link>

      <CategoryMenu onSelect={selectCategory} />

      <nav
        className="boutique-account-nav"
        aria-label="حساب و خرید"
      >
        <Link
          className="header-icon"
          href={authenticated ? "/profile" : "/login"}
          aria-label={
            authenticated
              ? "پروفایل کاربری"
              : "ورود به حساب"
          }
          title={
            authenticated
              ? "پروفایل کاربری"
              : "ورود به حساب"
          }
        >
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
          </svg>
        </Link>

        <Link
          className="header-icon"
          href="/cart"
          aria-label="سبد خرید"
          title="سبد خرید"
        >
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M5 7h14l1 14H4L5 7Z" />
            <path d="M8 8V6a4 4 0 0 1 8 0v2" />
          </svg>
        </Link>
      </nav>
    </header>
  );
}