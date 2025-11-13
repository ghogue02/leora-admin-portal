'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { ChevronDown } from "lucide-react";

// Reorganized navigation structure with dropdown categories
const salesHubMenu = [
  { label: "Customers", href: "/sales/customers" },
  { label: "Activities", href: "/sales/activities" },
  { label: "Samples", href: "/sales/samples" },
  { label: "Orders", href: "/sales/orders" },
  { label: "Catalog", href: "/sales/catalog" },
  { label: "Reports", href: "/sales/reports" },
  { label: "BTG Placements", href: "/sales/btg" },
  { label: "Call Plan", href: "/sales/call-plan" },
];

const operationsMenu = [
  { label: "Operations", href: "/sales/operations/queue" },
];

const settingsMenu = [
  { label: "Manager", href: "/sales/manager", adminOnly: true },
  { label: "LeorAI", href: "/sales/leora", description: "AI-powered sales copilot" },
];

const adminMenu = [
  { label: "Admin", href: "/admin", description: "Admin portal" },
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

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
      <div className="nav-inner">
        <Link
          href="/sales/dashboard"
          className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg"
        >
          Leora Sales
        </Link>
        <button
          type="button"
          className="touch-target inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-400 md:hidden"
          onClick={() => setMobileOpen((value) => !value)}
          aria-expanded={mobileOpen}
          aria-controls="sales-nav-menu"
          aria-label="Toggle sales navigation"
        >
          Menu
          <span className="text-xs text-gray-500">{mobileOpen ? "Close" : "Open"}</span>
        </button>
        <nav aria-label="Sales navigation" className="hidden md:block">
          <NavList pathname={pathname} onNavigate={closeMobile} onLogout={handleLogout} isLoggingOut={isLoggingOut} />
        </nav>
      </div>
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            aria-hidden="true"
            onClick={closeMobile}
          />
          <div className="md:hidden">
            <div className="border-t border-slate-200 bg-white/95 shadow-lg relative z-40">
              <div
                className="page-gutters pb-6 pt-4"
                id="sales-nav-menu"
                role="dialog"
                aria-modal="true"
                aria-label="Sales navigation menu"
              >
                <NavList pathname={pathname} onNavigate={closeMobile} onLogout={handleLogout} isLoggingOut={isLoggingOut} vertical />
              </div>
            </div>
          </div>
        </>
      )}
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
  const [salesHubOpen, setSalesHubOpen] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const salesHubRef = useRef<HTMLLIElement>(null);
  const operationsRef = useRef<HTMLLIElement>(null);
  const settingsRef = useRef<HTMLLIElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (salesHubRef.current && !salesHubRef.current.contains(event.target as Node)) {
        setSalesHubOpen(false);
      }
      if (operationsRef.current && !operationsRef.current.contains(event.target as Node)) {
        setOperationsOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Active state detection for dropdown categories
  const isSalesHubActive = salesHubMenu.some(item => pathname.startsWith(item.href));
  const isOperationsActive = operationsMenu.some(item => pathname.startsWith(item.href));
  const isSettingsActive = settingsMenu.some(item => pathname.startsWith(item.href)) ||
                           adminMenu.some(item => pathname.startsWith(item.href)) ||
                           toolsMenu.some(item => pathname.startsWith(item.href));

  // Mobile view: Flatten all dropdowns
  if (vertical) {
    return (
      <ul className="flex flex-col gap-4 text-sm font-medium text-gray-600">
        {/* Dashboard */}
        <li>
          <Link
            href="/sales/dashboard"
            className={`transition hover:text-gray-900 ${
              pathname === "/sales/dashboard" ? "text-gray-900 underline decoration-2 underline-offset-4" : ""
            }`}
            onClick={onNavigate}
          >
            Dashboard
          </Link>
        </li>

        {/* Sales Hub - Flattened */}
        <li>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Sales Hub</div>
          <ul className="ml-4 space-y-2">
            {salesHubMenu.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`transition hover:text-gray-900 ${
                    pathname.startsWith(item.href) ? "text-gray-900 font-semibold" : ""
                  }`}
                  onClick={onNavigate}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </li>

        {/* Operations - Flattened */}
        <li>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Operations</div>
          <ul className="ml-4 space-y-2">
            {operationsMenu.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`transition hover:text-gray-900 ${
                    pathname.startsWith(item.href) ? "text-gray-900 font-semibold" : ""
                  }`}
                  onClick={onNavigate}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </li>

        {/* Settings - Flattened */}
        <li>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Settings</div>
          <ul className="ml-4 space-y-2">
            {settingsMenu.map((item) => {
              if (item.adminOnly) return null; // Hide admin items in mobile for now (TODO: check user role)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`transition hover:text-gray-900 ${
                      pathname.startsWith(item.href) ? "text-gray-900 font-semibold" : ""
                    }`}
                    onClick={onNavigate}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}

            {/* Admin Section */}
            <li className="pt-2">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Admin</div>
            </li>
            {adminMenu.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`transition hover:text-gray-900 ${
                    pathname.startsWith(item.href) ? "text-gray-900 font-semibold" : ""
                  }`}
                  onClick={onNavigate}
                >
                  {item.label}
                </Link>
              </li>
            ))}

            {/* Tools Section */}
            <li className="pt-2">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Tools</div>
            </li>
            {toolsMenu.map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className={`transition hover:text-gray-900 ${
                    pathname.startsWith(tool.href) ? "text-gray-900 font-semibold" : ""
                  }`}
                  onClick={onNavigate}
                >
                  {tool.label}
                </Link>
              </li>
            ))}
          </ul>
        </li>

        {/* Logout */}
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

  // Desktop view: Horizontal with dropdowns
  return (
    <ul className="flex items-center gap-6 text-sm font-medium text-gray-600">
      {/* Dashboard */}
      <li>
        <Link
          href="/sales/dashboard"
          className={`transition hover:text-gray-900 ${
            pathname === "/sales/dashboard" ? "text-gray-900 underline decoration-2 underline-offset-4" : ""
          }`}
          onClick={onNavigate}
        >
          Dashboard
        </Link>
      </li>

      {/* Sales Hub Dropdown */}
      <li className="relative" ref={salesHubRef}>
        <button
          type="button"
          onClick={() => setSalesHubOpen(!salesHubOpen)}
          className={`flex items-center gap-1 transition hover:text-gray-900 ${
            isSalesHubActive ? "text-gray-900 underline decoration-2 underline-offset-4" : ""
          }`}
        >
          Sales Hub
          <ChevronDown className={`h-3 w-3 transition-transform ${salesHubOpen ? 'rotate-180' : ''}`} />
        </button>

        {salesHubOpen && (
          <div className="absolute left-0 top-full mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-50">
            {salesHubMenu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setSalesHubOpen(false);
                  onNavigate();
                }}
                className={`block px-4 py-2 text-sm transition hover:bg-gray-50 ${
                  pathname.startsWith(item.href) ? "bg-blue-50 text-blue-900 font-semibold" : "text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </li>

      {/* Operations Dropdown */}
      <li className="relative" ref={operationsRef}>
        <button
          type="button"
          onClick={() => setOperationsOpen(!operationsOpen)}
          className={`flex items-center gap-1 transition hover:text-gray-900 ${
            isOperationsActive ? "text-gray-900 underline decoration-2 underline-offset-4" : ""
          }`}
        >
          Operations
          <ChevronDown className={`h-3 w-3 transition-transform ${operationsOpen ? 'rotate-180' : ''}`} />
        </button>

        {operationsOpen && (
          <div className="absolute left-0 top-full mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-50">
            {operationsMenu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setOperationsOpen(false);
                  onNavigate();
                }}
                className={`block px-4 py-2 text-sm transition hover:bg-gray-50 ${
                  pathname.startsWith(item.href) ? "bg-blue-50 text-blue-900 font-semibold" : "text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </li>

      {/* Settings Dropdown */}
      <li className="relative" ref={settingsRef}>
        <button
          type="button"
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={`flex items-center gap-1 transition hover:text-gray-900 ${
            isSettingsActive ? "text-gray-900 underline decoration-2 underline-offset-4" : ""
          }`}
        >
          Settings
          <ChevronDown className={`h-3 w-3 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
        </button>

        {settingsOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-50">
            {settingsMenu.map((item) => {
              if (item.adminOnly) return null; // TODO: Check user role
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setSettingsOpen(false);
                    onNavigate();
                  }}
                  className={`block px-4 py-2 text-sm transition hover:bg-gray-50 ${
                    pathname.startsWith(item.href) ? "bg-blue-50 text-blue-900 font-semibold" : "text-gray-900"
                  }`}
                >
                  <div className="font-medium">{item.label}</div>
                  {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                </Link>
              );
            })}

            {/* Divider before Admin */}
            <div className="my-2 border-t border-gray-200" />
            <div className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Admin</div>

            {adminMenu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setSettingsOpen(false);
                  onNavigate();
                }}
                className={`block px-4 py-2 text-sm transition hover:bg-gray-50 ${
                  pathname.startsWith(item.href) ? "bg-blue-50 text-blue-900 font-semibold" : "text-gray-900"
                }`}
              >
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </Link>
            ))}

            {/* Divider before Tools */}
            <div className="my-2 border-t border-gray-200" />
            <div className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Tools</div>

            {toolsMenu.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => {
                  setSettingsOpen(false);
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
