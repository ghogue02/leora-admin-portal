'use client';

import { useMemo, useState } from "react";

export type PortalContact = {
  id: string;
  fullName: string;
  role: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  notes: string | null;
  businessCardUrl: string | null;
  createdAt: string;
};

export function PortalContactList({ contacts }: { contacts: PortalContact[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return contacts;
    const normalized = query.toLowerCase();
    return contacts.filter((contact) => {
      return (
        contact.fullName.toLowerCase().includes(normalized) ||
        contact.role?.toLowerCase().includes(normalized) ||
        contact.email?.toLowerCase().includes(normalized) ||
        contact.phone?.toLowerCase().includes(normalized)
      );
    });
  }, [contacts, query]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Account contacts</h2>
          <p className="text-xs text-gray-500">
            Point people recorded by the Well Crafted team.
          </p>
        </div>
        {contacts.length > 0 && (
          <div className="relative w-full max-w-xs">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search contacts..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {contacts.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">
          No contacts have been shared for this account yet.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500">No contacts matched “{query}”.</p>
          ) : (
            filtered.map((contact) => (
              <div key={contact.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{contact.fullName}</p>
                    {contact.role && (
                      <p className="text-sm text-gray-600">{contact.role}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Added {new Date(contact.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="mt-2 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                  {contact.email && (
                    <p>
                      Email:{" "}
                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                        {contact.email}
                      </a>
                    </p>
                  )}
                  {contact.phone && <p>Phone: {contact.phone}</p>}
                  {contact.mobile && <p>Mobile: {contact.mobile}</p>}
                </div>
                {contact.notes && (
                  <p className="mt-2 rounded-md bg-slate-50 p-2 text-sm text-gray-700 whitespace-pre-line">
                    {contact.notes}
                  </p>
                )}
                {contact.businessCardUrl && (
                  <a
                    href={contact.businessCardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    View business card
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
