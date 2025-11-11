"use client";

import { format, formatDistanceToNow } from "date-fns";

type CustomerSinceCardProps = {
  firstOrderDate: string | null;
};

export default function CustomerSinceCard({ firstOrderDate }: CustomerSinceCardProps) {
  if (!firstOrderDate) {
    return null;
  }

  const parsedDate = new Date(firstOrderDate);
  const formattedDate = format(parsedDate, "MMMM d, yyyy");
  const relativeText = formatDistanceToNow(parsedDate, { addSuffix: true });

  return (
    <section className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Customer Since
      </p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{formattedDate}</p>
      <p className="mt-1 text-sm text-gray-600">First recorded order {relativeText}</p>
    </section>
  );
}
