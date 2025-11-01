'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { ChevronDown } from "lucide-react";

const navigation = [
  { label: "LeorAI", href: "/sales/leora" },
  { label: "Dashboard", href: "/sales/dashboard" },
  { label: "Customers", href: "/sales/customers" },
  { label: "Call Plan", href: "/sales/call-plan" },
  { label: "Activities", href: "/sales/activities" },
  { label: "Samples", href: "/sales/samples" },
  { label: "Orders", href: "/sales/orders" },
  { label: "Catalog", href: "/sales/catalog" },
  { label: "Operations", href: "/sales/operations/queue" },
  { label: "Manager", href: "/sales/manager", adminOnly: true },
  { label: "Admin", href: "/admin", adminOnly: true },
];

const toolsMenu = [
  { label: "📸 Scan Business Card", href: "/sales/customers/scan-card", description: "Auto-populate customer from card" },
  { label: "📋 Scan License", href: "/sales/customers/scan-license", description: "Create account from liquor license" },
  { label: "🗺️ Customer Map", href: "/sales/customers/map", description: "Visual map of all customers" },
];

export default function SalesNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/sales/auth/logout", {
        method: "POST",
        headers: {
          "X-Tenant-Slug": process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG ?? "well-crafted",
        },
      });
      router.push("/sales/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  }, [router]);

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
        <Link href="/sales/dashboard" className="text-lg font-semibold tracking-tight text-gray-900">
          Leora Sales
        </Link>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 md:hidden"
          onClick={() => setMobileOpen((value) => !value)}
          aria-expanded={mobileOpen}
          aria-controls="sales-nav-menu"
        >
          Menu
          <span className="text-xs text-gray-500">{mobileOpen ? "Close" : "Open"}</span>
        </button>
        <nav aria-label="Sales navigation" className="hidden md:block">
          <NavList pathname={pathname} onNavigate={closeMobile} onLogout={handleLogout} isLoggingOut={isLoggingOut} />
        </nav>
      </div>
      {mobileOpen ? (
        <div className="md:hidden">
          <div
            className="border-t border-slate-200 bg-white/95 px-4 py-4 shadow-lg"
            id="sales-nav-menu"
            role="dialog"
            aria-modal="true"
          >
            <NavList pathname={pathname} onNavigate={closeMobile} onLogout={handleLogout} isLoggingOut={isLoggingOut} vertical />
          </div>
        </div>
      ) : null}
    </header>
  );
}

function NavList({
  pathname,
  onNavigate,
  onLogout,
  isLoggingOut,
  vertical = false,
}: {
  pathname: string;
  onNavigate: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
  vertical?: boolean;
}) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLLIElement>(null);

  // Close tools dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isToolsActive = toolsMenu.some(item => pathname.startsWith(item.href));

  return (
    <ul
      className={`text-sm font-medium text-gray-600 ${vertical ? "flex flex-col gap-4" : "flex items-center gap-6"}`}
    >
      {navigation.map((item) => {
        const isActive = item.href === "/sales/dashboard" ? pathname === item.href : pathname.startsWith(item.href);

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

      {/* Tools Dropdown */}
      <li className="relative" ref={toolsRef}>
        <button
          type="button"
          onClick={() => setToolsOpen(!toolsOpen)}
          className={`flex items-center gap-1 transition hover:text-gray-900 ${
            isToolsActive ? "text-gray-900 underline decoration-2 underline-offset-4" : ""
          }`}
        >
          Tools
          <ChevronDown className={`h-3 w-3 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
        </button>

        {toolsOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-50">
            {toolsMenu.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => {
                  setToolsOpen(false);
                  onNavigate();
                }}
                className="block px-4 py-2 text-sm hover:bg-gray-50 transition"
              >
                <div className="font-medium text-gray-900">{tool.label}</div>
                <div className="text-xs text-gray-500">{tool.description}</div>
              </Link>
            ))}
          </div>
        )}
      </li>

      <li>
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="text-sm font-medium text-gray-600 transition hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </li>
    </ul>
  );
}
