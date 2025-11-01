'use client';

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import CustomerProvider from "./_components/CustomerProvider";
import SalesNav from "./_components/SalesNav";
import ToastProvider from "./_components/ToastProvider";
import Breadcrumbs from "@/components/shared/Breadcrumbs";

export default function SalesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/sales/login";

  return (
    <CustomerProvider>
      <ToastProvider>
        <div className="min-h-screen bg-slate-50 text-gray-900">
          {!isLoginPage && <SalesNav />}
          <div className={isLoginPage ? "" : "px-4 pb-12 pt-24 md:px-8"}>
            {!isLoginPage && (
              <div className="mx-auto mb-4 w-full max-w-7xl px-2 sm:px-4 md:px-6">
                <Breadcrumbs homeHref="/sales" homeLabel="Sales Dashboard" />
              </div>
            )}
            {children}
          </div>
        </div>
      </ToastProvider>
    </CustomerProvider>
  );
}
