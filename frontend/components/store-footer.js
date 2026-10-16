"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "../lib/api";

export default function StoreFooter() {
  const [store, setStore] = useState(null);

  useEffect(() => {
    let active = true;

    api("store/")
      .then((data) => {
        if (active) {
          setStore(data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const info = store?.settings || {};
  const pages = store?.pages || [];

  return (
    <footer className="store-footer">
      <div>
        <strong>LUXE LEATHER</strong>

        {info.phone && (
          <p>
            <a href={`tel:${info.phone}`}>
              {info.phone}
            </a>
          </p>
        )}

        {info.hours && <p>{info.hours}</p>}
      </div>

      <nav aria-label="اطلاعات فروشگاه">
        {pages.map((page) => (
          <Link
            key={page.slug}
            href={`/info/${page.slug}`}
          >
            {page.title}
          </Link>
        ))}
      </nav>
    </footer>
  );
}