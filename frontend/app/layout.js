import "./globals.css";
import Link from "next/link";
import { CartProvider } from "../components/cart-context";
import CartLink from "../components/cart-link";
export const metadata = { title: "فروشگاه چرم", description: "محصولات چرمی و سبد خرید" };
export default function Layout({children}) {
 return <html lang="fa" dir="rtl"><body><CartProvider><header><Link className="brand" href="/">چرم<span>ساخته برای ماندن</span></Link><nav><Link href="/">محصولات</Link><CartLink /></nav></header><main>{children}</main><footer>فروشگاه چرم · انتخابی برای هر روز</footer></CartProvider></body></html>;
}
