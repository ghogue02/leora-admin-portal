"use client";

import SharedBreadcrumbs from "@/components/shared/Breadcrumbs";

/**
 * Admin-specific breadcrumbs wrapper
 * Uses the shared Breadcrumbs component with admin-specific defaults
 */
export default function Breadcrumbs() {
  return (
    <SharedBreadcrumbs
      homeHref="/admin"
      homeLabel="Admin Portal"
      showHomeIcon={true}
    />
  );
}
