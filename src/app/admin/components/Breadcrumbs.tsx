"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumbs() {
  const pathname = usePathname();

  // Generate breadcrumb items from pathname
  const segments = pathname.split("/").filter(Boolean);

  // If we're on the admin home page, don't show breadcrumbs
  if (segments.length === 1 && segments[0] === "admin") {
    return null;
  }

  const breadcrumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return {
      label,
      href,
      isLast: index === segments.length - 1,
    };
  });

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600" aria-label="Breadcrumb">
      <Link
        href="/admin"
        className="flex items-center hover:text-gray-900"
        aria-label="Admin home"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-gray-400" />
          {crumb.isLast ? (
            <span className="font-medium text-gray-900">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-gray-900">
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
