'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const navigation = [
  { label: "Dashboard", href: "/portal" },
  { label: "Catalog", href: "/portal/catalog" },
  { label: "Orders", href: "/portal/orders" },
  { label: "Invoices", href: "/portal/invoices" },
  { label: "Copilot", href: "/portal/leora" },
  { label: "Audit", href: "/portal/audit/fulfillment" },
  { label: "Account", href: "/portal/account" },
];

export default function PortalNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <Link href="/portal" className="text-lg font-semibold tracking-tight text-gray-900">
            Leora Portal
          </Link>
          <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 md:inline-flex">
            Sales Mode
          </span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 md:hidden"
          onClick={() => setMobileOpen((value) => !value)}
          aria-expanded={mobileOpen}
          aria-controls="portal-nav-menu"
        >
          Menu
          <span className="text-xs text-gray-500">{mobileOpen ? "Close" : "Open"}</span>
        </button>
        <nav aria-label="Portal navigation" className="hidden md:block">
          <NavList pathname={pathname} onNavigate={closeMobile} />
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/portal/admin"
            aria-label="Switch to Admin mode"
            className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
          >
            Switch to Admin
          </Link>
        </div>
      </div>
      {mobileOpen ? (
        <div className="md:hidden">
          <div
            className="border-t border-slate-200 bg-white/95 px-4 py-4 shadow-lg"
            id="portal-nav-menu"
            role="dialog"
            aria-modal="true"
          >
            <NavList pathname={pathname} onNavigate={closeMobile} vertical />
            <div className="mt-4 border-t border-slate-200 pt-4">
              <Link
                href="/portal/admin"
                aria-label="Switch to Admin mode"
                className="inline-flex w-full items-center justify-center rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                onClick={closeMobile}
              >
                Switch to Admin
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function NavList({
  pathname,
  onNavigate,
  vertical = false,
}: {
  pathname: string;
  onNavigate: () => void;
  vertical?: boolean;
}) {
  return (
    <ul
      className={`text-sm font-medium text-gray-600 ${vertical ? "flex flex-col gap-4" : "flex items-center gap-6"}`}
    >
      {navigation.map((item) => {
        const isActive = item.href === "/portal" ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`transition hover:text-gray-900 ${
                isActive ? "text-gray-900 underline decoration-2 underline-offset-4" : ""
              }`}
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
