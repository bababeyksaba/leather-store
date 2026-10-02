"use client";

import Link from "next/link";
import { useAuth } from "./auth-context";

export default function AccountLink() {
  const { session, loading } = useAuth();

  const authenticated = session?.authenticated;

  return (
    <Link
      className="account-link"
      href={authenticated ? "/profile" : "/login"}
      aria-label={
        authenticated ? "حساب کاربری" : "ورود به حساب"
      }
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </svg>

      <span>
        {loading
          ? "حساب کاربری"
          : authenticated
            ? "حساب من"
            : "ورود"}
      </span>
    </Link>
  );
}