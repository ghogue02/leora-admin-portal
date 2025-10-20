import type { ReactNode } from "react";
import CartProvider from "./_components/CartProvider";
import SalesNav from "./_components/SalesNav";
import ToastProvider from "./_components/ToastProvider";

export default function SalesLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <ToastProvider>
        <div className="min-h-screen bg-slate-50 text-gray-900">
          <SalesNav />
          <div className="px-4 pb-12 pt-24 md:px-8">{children}</div>
        </div>
      </ToastProvider>
    </CartProvider>
  );
}
