"use client";

import Link from "next/link";

type GoogleProfileCardProps = {
  customer: {
    googlePlaceName: string | null;
    googlePlaceId: string | null;
    googleFormattedAddress: string | null;
    website: string | null;
    googleMapsUrl: string | null;
    googleBusinessStatus: string | null;
    googlePlaceTypes: string[];
    phone: string | null;
    internationalPhone: string | null;
  };
};

export function GoogleProfileCard({ customer }: GoogleProfileCardProps) {
  const hasData =
    customer.googlePlaceName ||
    customer.googlePlaceId ||
    customer.googleFormattedAddress ||
    customer.website ||
    customer.googleMapsUrl ||
    customer.googleBusinessStatus ||
    customer.googlePlaceTypes.length > 0;

  if (!hasData) {
    return null;
  }

  const mapsLink = customer.googleMapsUrl
    ? customer.googleMapsUrl
    : customer.googlePlaceId
      ? `https://www.google.com/maps/place/?q=place_id:${customer.googlePlaceId}`
      : null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Google Profile</h2>
          <p className="text-sm text-gray-500">Canonical data pulled from Google Maps.</p>
        </div>
        {mapsLink && (
          <Link
            href={mapsLink}
            target="_blank"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            Open in Maps →
          </Link>
        )}
      </div>
      <dl className="mt-4 grid gap-4 md:grid-cols-2">
        {customer.googlePlaceName && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Place Name</dt>
            <dd className="text-sm text-gray-900">{customer.googlePlaceName}</dd>
          </div>
        )}
        {customer.googleBusinessStatus && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Business Status</dt>
            <dd className="text-sm text-gray-900">{customer.googleBusinessStatus}</dd>
          </div>
        )}
        {customer.googlePlaceId && (
          <div className="md:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-gray-500">Place ID</dt>
            <dd className="text-sm font-mono text-gray-900 break-all">{customer.googlePlaceId}</dd>
          </div>
        )}
        {customer.googleFormattedAddress && (
          <div className="md:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-gray-500">Formatted Address</dt>
            <dd className="text-sm text-gray-900">{customer.googleFormattedAddress}</dd>
          </div>
        )}
        {customer.website && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Website</dt>
            <dd className="text-sm">
              <Link href={customer.website} target="_blank" className="text-emerald-700 hover:underline">
                {customer.website}
              </Link>
            </dd>
          </div>
        )}
        {customer.googlePlaceTypes.length > 0 && (
          <div className="md:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-gray-500">Place Types</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {customer.googlePlaceTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                >
                  {type}
                </span>
              ))}
            </dd>
          </div>
        )}
        {(customer.internationalPhone || customer.phone) && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Phone Numbers</dt>
            <dd className="text-sm text-gray-900 space-y-1">
              {customer.phone && <div>Local: {customer.phone}</div>}
              {customer.internationalPhone && <div>Intl: {customer.internationalPhone}</div>}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
