import "./globals.css";
import "./cart.css";
import "./account.css";
import "./home.css";
import "./product-detail.css";
import "./price.css";

import { CartProvider } from "../components/cart-context";
import { AuthProvider } from "../components/auth-context";

import SiteHeader from "../components/site-header";
import StoreFooter from "../components/store-footer";

export const metadata = {
  title: "فروشگاه چرم طبیعی دست‌دوز",
  description: "محصولات چرم طبیعی دست‌دوز",
};

export default function Layout({ children }) {
  return (
    <html
      lang="fa"
      dir="rtl"
      data-scroll-behavior="smooth"
    >
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