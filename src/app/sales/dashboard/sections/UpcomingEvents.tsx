'use client';

import Link from "next/link";

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  eventType: string | null;
  location: string | null;
  customer: {
    id: string;
    name: string;
  } | null;
};

type UpcomingEventsProps = {
  events: CalendarEvent[];
};

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  if (events.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
        <p className="mt-2 text-sm text-gray-600">
          No events scheduled for the next 10 days. Consider scheduling customer visits or tastings.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
          <p className="text-xs text-gray-500">Next 7-10 days from your calendar</p>
        </div>
        <Link
          href="/sales/calendar"
          className="text-xs font-semibold text-gray-600 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
        >
          View calendar
        </Link>
      </div>

      <ul className="mt-4 space-y-3">
        {events.map((event) => {
          const startDate = new Date(event.startTime);
          const endDate = new Date(event.endTime);
          const now = new Date();
          const daysUntil = Math.ceil(
            (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          return (
            <li
              key={event.id}
              className="flex items-start gap-4 rounded-md border border-slate-200 px-4 py-3"
            >
              <div className="flex flex-col items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-xs font-semibold uppercase text-gray-500">
                  {startDate.toLocaleDateString("en-US", { month: "short" })}
                </span>
                <span className="text-2xl font-bold text-gray-900">
                  {startDate.getDate()}
                </span>
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                    {event.customer && (
                      <Link
                        href={`/sales/customers/${event.customer.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {event.customer.name}
                      </Link>
                    )}
                  </div>
                  {event.eventType && <EventTypeBadge type={event.eventType} />}
                </div>

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>
                    {startDate.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {endDate.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  {event.location && <span>{event.location}</span>}
                  {daysUntil === 0 ? (
                    <span className="font-semibold text-rose-700">Today</span>
                  ) : daysUntil === 1 ? (
                    <span className="font-semibold text-amber-700">Tomorrow</span>
                  ) : (
                    <span>In {daysUntil} days</span>
                  )}
                </div>

                {event.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EventTypeBadge({ type }: { type: string }) {
  const typeConfig: Record<string, { label: string; className: string }> = {
    tasting: {
      label: "Tasting",
      className: "bg-purple-100 text-purple-700",
    },
    visit: {
      label: "Visit",
      className: "bg-blue-100 text-blue-700",
    },
    meeting: {
      label: "Meeting",
      className: "bg-green-100 text-green-700",
    },
  };

  const config = typeConfig[type.toLowerCase()] || {
    label: type,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
