"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
export default function InformationPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null), [store, setStore] = useState(null), [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setPage(null); setError("");
    Promise.all([api(`store/pages/${encodeURIComponent(slug)}/`), api("store/")]).then(([p, s]) => { if (active) { setPage(p); setStore(s.settings); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [slug]);
  return <article className="information-page"><Link href="/">بازگشت به فروشگاه ←</Link>{error ? <p className="error" role="alert">{error}</p> : !page ? <p>در حال دریافت…</p> : <><h1>{page.title}</h1><div className="preserve-lines">{page.body}</div>{slug === "contact" && store && <dl className="spec-list">{[["تلفن", store.phone], ["ایمیل", store.email], ["آدرس", store.address], ["ساعات پاسخ‌گویی", store.hours], ["واتساپ", store.whatsapp], ["اینستاگرام", store.instagram]].filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}</>}</article>;
}
