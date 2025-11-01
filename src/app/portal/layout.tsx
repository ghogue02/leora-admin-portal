import type { ReactNode } from "react";
import PortalNav from "./_components/PortalNav";
import ToastProvider from "./_components/ToastProvider";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 text-gray-900">
        <PortalNav />
        <div className="px-4 pb-12 pt-24 md:px-8">{children}</div>
      </div>
    </ToastProvider>
  );
}
