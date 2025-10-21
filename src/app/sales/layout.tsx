'use client';

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import CartProvider from "./_components/CartProvider";
import CustomerProvider from "./_components/CustomerProvider";
import SalesNav from "./_components/SalesNav";
import ToastProvider from "./_components/ToastProvider";

export default function SalesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/sales/login";

  return (
    <CustomerProvider>
      <CartProvider>
        <ToastProvider>
          <div className="min-h-screen bg-slate-50 text-gray-900">
            {!isLoginPage && <SalesNav />}
            <div className={isLoginPage ? "" : "px-4 pb-12 pt-24 md:px-8"}>
              {children}
            </div>
          </div>
        </ToastProvider>
      </CartProvider>
    </CustomerProvider>
  );
}
