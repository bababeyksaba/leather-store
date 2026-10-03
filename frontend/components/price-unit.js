"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
let cached = null;
let pending = null;
export default function PriceUnit() {
  const [unit, setUnit] = useState(cached || "تومان");
  useEffect(() => {
    if (cached) return;
    pending ||= api("store/").then(data => { cached = data.settings?.price_unit || "تومان"; return cached; }).catch(() => "تومان");
    let active = true;
    pending.then(value => { if (active) setUnit(value); });
    return () => { active = false; };
  }, []);
  return <>{unit}</>;
}

