"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  MapPin,
  ShoppingCart,
  Palette,
  FileText,
  Settings,
  Package,
  ScrollText,
  UserCog,
  ActivitySquare,
  BellRing,
  Plug,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  DollarSign,
  List,
} from "lucide-react";

const navigation = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    label: "Sales Reps & Territories",
    href: "/admin/sales-reps",
    icon: MapPin,
  },
  {
    label: "Orders & Invoices",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    label: "Activity Log",
    href: "/admin/activities",
    icon: ActivitySquare,
  },
  {
    label: "Invoice Templates",
    href: "/admin/invoices/templates",
    icon: Palette,
  },
  {
    label: "Accounts & Users",
    href: "/admin/accounts",
    icon: UserCog,
  },
  {
    label: "Inventory & Products",
    href: "/admin/inventory",
    icon: Package,
    submenu: [
      {
        label: "All Products",
        href: "/admin/inventory",
        icon: List,
      },
      {
        label: "Price Management",
        href: "/admin/inventory/prices",
        icon: DollarSign,
      },
      {
        label: "Price Lists",
        href: "/admin/inventory/pricing",
        icon: FileText,
      },
    ],
  },
  {
    label: "Sample Follow-ups",
    href: "/admin/samples/follow-ups",
    icon: BellRing,
  },
  {
    label: "Audit Logs",
    href: "/admin/audit-logs",
    icon: ScrollText,
  },
  {
    label: "Bulk Operations",
    href: "/admin/bulk-operations",
    icon: FileText,
  },
  {
    label: "Data Integrity",
    href: "/admin/data-integrity",
    icon: Settings,
  },
  {
    label: "Settings",
    href: "/admin/settings/orders",
    icon: SlidersHorizontal,
  },
  {
    label: "Integrations",
    href: "/admin/integrations",
    icon: Plug,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    "/admin/inventory": true, // Inventory menu starts expanded
  });

  const toggleMenu = (href: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <Link href="/admin" className="text-xl font-bold tracking-tight text-gray-900">
          Admin Portal
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const isExpanded = expandedMenus[item.href];

          return (
            <div key={item.href}>
              {hasSubmenu ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.href)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-slate-100 text-gray-900"
                        : "text-gray-600 hover:bg-slate-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.submenu.map((subitem) => {
                        const SubIcon = subitem.icon;
                        const isSubActive = pathname === subitem.href;
                        return (
                          <Link
                            key={subitem.href}
                            href={subitem.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                              isSubActive
                                ? "bg-slate-100 text-gray-900"
                                : "text-gray-600 hover:bg-slate-50 hover:text-gray-900"
                            }`}
                          >
                            <SubIcon className="h-4 w-4" />
                            {subitem.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-100 text-gray-900"
                      : "text-gray-600 hover:bg-slate-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="text-xs text-gray-500">
          Leora Admin Portal v1.0
        </div>
      </div>
    </div>
  );
}
