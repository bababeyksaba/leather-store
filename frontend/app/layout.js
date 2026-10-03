import "./globals.css";
import "./account.css";

import Link from "next/link";

import { CartProvider } from "../components/cart-context";
import { AuthProvider } from "../components/auth-context";

import CartLink from "../components/cart-link";
import AccountLink from "../components/account-link";

import StoreFooter from "../components/store-footer";

export const metadata = {
  title: "فروشگاه چرم",
  description: "محصولات چرمی و سبد خرید",
};

export default function Layout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <AuthProvider>
          <CartProvider>
            <header>
              <Link className="brand" href="/">
                چرم
                <span>ساخته برای ماندن</span>
              </Link>

              <nav>
                <Link href="/">محصولات</Link>
                <CartLink />
                <AccountLink />
              </nav>
            </header>

            <main>{children}</main>

            <StoreFooter />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
