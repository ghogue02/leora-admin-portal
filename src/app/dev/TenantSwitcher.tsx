"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ChangeEvent } from "react";

export type TenantOption = {
  slug: string;
  name: string;
};

export function TenantSwitcher({
  tenants,
  currentSlug,
}: {
  tenants: TenantOption[];
  currentSlug: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextSlug = event.target.value;
    const params = new URLSearchParams(searchParams ? searchParams.toString() : undefined);
    if (nextSlug) {
      params.set("tenant", nextSlug);
    } else {
      params.delete("tenant");
    }

    startTransition(() => {
      const query = params.toString();
      router.push(query ? `/dev?${query}` : "/dev");
    });
  }

  return (
    <label className="text-sm text-gray-600">
      Tenant
      <select
        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none"
        value={currentSlug}
        onChange={handleChange}
        disabled={pending}
      >
        {tenants.map((tenant) => (
          <option key={tenant.slug} value={tenant.slug}>
            {tenant.name}
          </option>
        ))}
      </select>
    </label>
  );
}
