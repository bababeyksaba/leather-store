"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

const banners = [
  {
    position: "main",
    image: "/images/home/banner1.png",
    alt: "مجموعه محصولات چرم طبیعی دست‌دوز",
    title: "زیبایی در جزئیات",
    description: "چرم طبیعی، دوخته‌شده با دست و عشق",
  },
  {
    position: "wallet",
    image: "/images/home/banner2.png",
    alt: "مجموعه کیف پول‌های چرم طبیعی دست‌دوز",
    title: "جزئیات ماندگار",
    description: "انتخابی برای هر روز",
  },
  {
    position: "crossbody",
    image: "/images/home/banner3.png",
    alt: "مجموعه کیف‌های چرم طبیعی دست‌دوز",
    title: "همراهِ روزهای شما",
    description: "سبک و کاربردی",
  },
];

export default function HomepageHero() {
  const [destinations, setDestinations] = useState({});
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    setError("");

    api("products/homepage/banners/")
      .then((data) => {
        if (!active) return;

        const rows = Array.isArray(data)
          ? data
          : data?.results ?? [];

        const result = {};

        rows.forEach((item) => {
          if (item.position && item.category_slug) {
            result[item.position] = item;
          }
        });

        setDestinations(result);
      })
      .catch((err) => {
        if (!active) return;

        setDestinations({});
        setError(
          err.message || "دریافت لینک بنرها ناموفق بود."
        );
      });

    return () => {
      active = false;
    };
  }, [retry]);

  function selectCategory(event, destination) {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    if (window.location.pathname !== "/") {
      return;
    }

    event.preventDefault();

    const url = new URL(window.location.href);

    url.searchParams.set(
      "category",
      destination.category_slug
    );
    url.searchParams.delete("page");
    url.hash = "catalog";

    window.history.replaceState(
      window.history.state,
      "",
      url.toString()
    );

    window.dispatchEvent(
      new CustomEvent("catalog-category", {
        detail: {
          slug: destination.category_slug,
          title: destination.category_name,
        },
      })
    );

    document.getElementById("catalog")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function renderBanner(banner) {
    const destination = destinations[banner.position];
    const main = banner.position === "main";

    const className = main
      ? "boutique-main-banner homepage-linked-banner"
      : "boutique-small-banner homepage-linked-banner";

    const content = (
      <>
        <img
          src={banner.image}
          alt={banner.alt}
          fetchPriority={main ? "high" : undefined}
          loading={main ? "eager" : "lazy"}
          decoding="async"
          style={
            main
              ? {
                  objectFit: "cover",
                  objectPosition: "35% center",
                }
              : undefined
          }
        />

        <div
          className={
            main ? "boutique-hero-copy" : undefined
          }
        >
          {main && (
            <p>فروشگاه چرم طبیعی دست‌دوز</p>
          )}

          {main ? (
            <h1>{banner.title}</h1>
          ) : (
            <h2>{banner.title}</h2>
          )}

          <p>{banner.description}</p>

          {destination && (
            <span
              className={
                "boutique-cta"
              }
            >
              مشاهدهٔ محصولات ←
            </span>
          )}
        </div>
      </>
    );

    if (!destination) {
      return (
        <div
          key={banner.position}
          className={className}
        >
          {content}
        </div>
      );
    }

    return (
      <a
        key={banner.position}
        className={className}
        href={`/?category=${encodeURIComponent(
          destination.category_slug
        )}#catalog`}
        aria-label={`مشاهدهٔ محصولات ${destination.category_name}`}
        onClick={(event) =>
          selectCategory(event, destination)
        }
      >
        {content}
      </a>
    );
  }

  return (
    <>
      <section
        className="boutique-hero"
        aria-label="مجموعه‌های فروشگاه"
      >
        {renderBanner(banners[0])}

        <div className="boutique-side-banners">
          {banners.slice(1).map(renderBanner)}
        </div>
      </section>

      {error && (
        <div className="error" role="alert">
          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              setRetry((value) => value + 1)
            }
          >
            تلاش دوباره
          </button>
        </div>
      )}
    </>
  );
}