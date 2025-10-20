import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

type Invoice = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  total: number;
  balanceDue: number;
  issuedAt: string | null;
  dueDate: string | null;
  order: {
    id: string;
    status: string;
    orderedAt: string | null;
  } | null;
};

type InvoiceResponse = {
  invoices: Invoice[];
};

async function fetchInvoices(): Promise<Invoice[]> {
  const headerStore = await headers();
  const host = headerStore.get("host");
  if (!host) {
    throw new Error("Unable to resolve host for invoices fetch.");
  }
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;
  const cookie = headerStore.get("cookie") ?? undefined;

  const response = await fetch(`${baseUrl}/api/portal/invoices`, {
    cache: "no-store",
    headers: cookie
      ? {
          cookie,
        }
      : undefined,
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Unable to load invoices.");
  }

  const payload = (await response.json()) as InvoiceResponse;
  return payload.invoices;
}

export default async function InvoicesPage() {
  const invoices = await fetchInvoices();
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Invoices</p>
        <h1 className="text-3xl font-semibold text-gray-900">Track billing status.</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Review issued invoices, remaining balances, and jump into order context when needed.
        </p>
      </header>

      {invoices.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-gray-600">
          No invoices yet. Once orders are invoiced, they will appear here automatically.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-gray-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Invoice</th>
                <th className="px-4 py-3 text-left">Issued</th>
                <th className="px-4 py-3 text-left">Due</th>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-500">{invoice.status}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {invoice.order ? (
                      <Link
                        href={`/portal/orders/${invoice.order.id}`}
                        className="text-xs font-semibold text-gray-600 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
                      >
                        #{invoice.order.id.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {currencyFormatter.format(invoice.total)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {currencyFormatter.format(invoice.balanceDue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
