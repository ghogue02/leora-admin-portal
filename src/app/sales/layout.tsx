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
          <main
            className={
              isLoginPage
                ? "layout-shell-tight py-10"
                : "page-gutters safe-nav-offset pb-12"
            }
          >
            {!isLoginPage && (
              <div className="layout-shell-tight mb-4">
                <Breadcrumbs homeHref="/sales" homeLabel="Sales Dashboard" />
              </div>
            )}
            {children}
          </main>
        </div>
      </ToastProvider>
    </CustomerProvider>
  );
}
