import "./globals.css";
import "./product-detail.css";
import "./account.css";
import "./home.css";

import { CartProvider } from "../components/cart-context";
import { AuthProvider } from "../components/auth-context";

import SiteHeader from "../components/site-header";
import StoreFooter from "../components/store-footer";

export const metadata = {
  title: "فروشگاه چرم",
  description: "فروشگاه محصولات چرمی",
};

export default function Layout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <AuthProvider>
          <CartProvider>
            <SiteHeader />

            <main>{children}</main>

            <StoreFooter />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}