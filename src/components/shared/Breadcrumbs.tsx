"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href: string | null;
}

interface BreadcrumbsProps {
  /**
   * Custom breadcrumb items. If provided, these will be used instead of auto-generation.
   * Useful for dynamic routes or custom labels.
   */
  items?: BreadcrumbItem[];
  /**
   * The home route to use (e.g., '/admin' or '/sales')
   */
  homeHref?: string;
  /**
   * Custom home label (defaults to 'Home')
   */
  homeLabel?: string;
  /**
   * Whether to show the home icon
   */
  showHomeIcon?: boolean;
}

export default function Breadcrumbs({
  items: customItems,
  homeHref = "/",
  homeLabel = "Home",
  showHomeIcon = true,
}: BreadcrumbsProps) {
  const pathname = usePathname();

  // If custom items are provided, use them
  if (customItems) {
    return (
      <nav className="flex items-center gap-2 text-sm text-gray-600" aria-label="Breadcrumb">
        <Link
          href={homeHref}
          className="flex items-center hover:text-gray-900 transition"
          aria-label={homeLabel}
        >
          {showHomeIcon ? <Home className="h-4 w-4" /> : <span>{homeLabel}</span>}
        </Link>

        {customItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-gray-400" />
            {item.href ? (
              <Link href={item.href} className="hover:text-gray-900 transition">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-gray-900">{item.label}</span>
            )}
          </div>
        ))}
      </nav>
    );
  }

  // Auto-generate breadcrumbs from pathname
  const segments = pathname.split("/").filter(Boolean);

  // If we're on the home page, don't show breadcrumbs
  if (segments.length === 0 || pathname === homeHref) {
    return null;
  }

  const breadcrumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = formatSegmentLabel(segment);

    return {
      label,
      href,
      isLast: index === segments.length - 1,
    };
  });

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600" aria-label="Breadcrumb">
      <Link
        href={homeHref}
        className="flex items-center hover:text-gray-900 transition"
        aria-label={homeLabel}
      >
        {showHomeIcon ? <Home className="h-4 w-4" /> : <span>{homeLabel}</span>}
      </Link>

      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-gray-400" />
          {crumb.isLast ? (
            <span className="font-medium text-gray-900">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-gray-900 transition">
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

/**
 * Format a URL segment into a human-readable label
 */
function formatSegmentLabel(segment: string): string {
  // Handle common cases
  const specialCases: Record<string, string> = {
    'call-plan': 'Call Plan',
    'sales-reps': 'Sales Reps & Territories',
    'audit-logs': 'Audit Logs',
    'bulk-operations': 'Bulk Operations',
    'data-integrity': 'Data Integrity',
    'purchase-orders': 'Purchase Orders',
    'sales-sheets': 'Sales Sheets',
    'pick-sheets': 'Pick Sheets',
    'scan-card': 'Scan Card',
    'scan-license': 'Scan License',
    'admin': 'Admin Portal',
    'accounts': 'Accounts & Users',
    'territories': 'Sales Territories',
  };

  if (specialCases[segment]) {
    return specialCases[segment];
  }

  // Handle UUID-like patterns (show as ID)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return 'Details';
  }

  // Handle numeric IDs
  if (/^\d+$/.test(segment)) {
    return `#${segment}`;
  }

  // Default: capitalize each word
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
