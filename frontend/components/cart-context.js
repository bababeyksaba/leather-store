"use client";
import {createContext, useContext, useEffect, useRef, useState} from "react";
import {api} from "../lib/api";
const Context = createContext(null);
export function CartProvider({children}) {
 const [cart,setCart] = useState(null), [error,setError] = useState(""), [busy,setBusy] = useState(false);
 const lock = useRef(false);
 async function refresh() { const data = await api("cart/"); setCart(data); setError(""); return data; }
 useEffect(() => { refresh().catch(e => setError(e.message)); }, []);
 async function mutate(path, method, quantity) {
  if (lock.current) throw new Error("لطفاً منتظر پایان درخواست قبلی بمانید.");
  lock.current = true; setBusy(true);
  try {
   const current = await refresh();
   await api(path, {method, headers:{"Content-Type":"application/json", "X-CSRFToken":current.csrf_token}, ...(quantity === undefined ? {} : {body:JSON.stringify({quantity})})});
   await refresh();
  } catch(e) {setError(e.message); throw e;} finally {lock.current=false;setBusy(false);}
 }
 return <Context.Provider value={{cart,error,busy,refresh,add:(id,q)=>mutate(`cart/items/${id}/`, "POST", q),remove:id=>mutate(`cart/items/${id}/delete/`, "DELETE")}}>{children}</Context.Provider>;
}
export const useCart = () => useContext(Context);
