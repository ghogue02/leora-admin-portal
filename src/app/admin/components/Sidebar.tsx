"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
];

export default function Sidebar() {
  const pathname = usePathname();

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

          return (
            <Link
              key={item.href}
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
