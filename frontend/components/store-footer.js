"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
export default function StoreFooter() {
  const [store, setStore] = useState(null);
  useEffect(() => { api("store/").then(setStore).catch(() => {}); }, []);
  const info = store?.settings || {};
  return <footer className="store-footer"><div><strong>{info.name || "فروشگاه چرم"}</strong>{info.phone && <p><a href={`tel:${info.phone}`}>{info.phone}</a></p>}{info.hours && <p>{info.hours}</p>}</div><nav aria-label="اطلاعات فروشگاه">{(store?.pages || []).map(p => <Link key={p.slug} href={`/info/${p.slug}`}>{p.title}</Link>)}</nav></footer>;
}
