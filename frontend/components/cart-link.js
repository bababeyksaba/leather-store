"use client";
import Link from "next/link";
import {useCart} from "./cart-context";
export default function CartLink() {const {cart}=useCart();return <Link className="cart-link" href="/cart">سبد خرید <b>{cart?.total_quantity ?? 0}</b></Link>;}
