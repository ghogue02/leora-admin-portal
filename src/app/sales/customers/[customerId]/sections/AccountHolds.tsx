'use client';

import { format, differenceInDays } from "date-fns";

type Invoice = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  total: number;
  dueDate: string | null;
  issuedAt: string | null;
  daysOverdue: number;
};

type AccountHoldsProps = {
  invoices: Invoice[];
  outstandingBalance: number;
};

export default function AccountHolds({
  invoices,
  outstandingBalance,
}: AccountHoldsProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const overdueInvoices = invoices.filter((inv) => inv.status === "OVERDUE");
  const hasAccountIssues = outstandingBalance > 0 || overdueInvoices.length > 0;

  if (!hasAccountIssues) {
    return (
      <section className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="font-semibold text-green-900">Account in Good Standing</h3>
            <p className="text-xs text-green-700">No outstanding balances or holds</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-rose-200 bg-rose-50 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-rose-900">Account Issues</h3>
            <p className="text-xs text-rose-700">
              {overdueInvoices.length > 0
                ? `${overdueInvoices.length} overdue invoice${
                    overdueInvoices.length !== 1 ? "s" : ""
                  }`
                : "Outstanding balance"}
            </p>
          </div>
        </div>
        <div className="rounded-md border border-rose-300 bg-rose-100 px-3 py-1.5 text-right">
          <p className="text-xs font-semibold text-rose-700">Total Due</p>
          <p className="text-lg font-bold text-rose-900">
            {formatCurrency(outstandingBalance)}
          </p>
        </div>
      </div>

      {overdueInvoices.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            Overdue Invoices
          </p>
          {overdueInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between rounded-md border border-rose-300 bg-rose-100 p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-rose-900">
                    {invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
                  </span>
                  <span className="rounded-full bg-rose-200 px-2 py-0.5 text-xs font-semibold text-rose-800">
                    {invoice.daysOverdue} days overdue
                  </span>
                </div>
                {invoice.dueDate && (
                  <p className="mt-1 text-xs text-rose-700">
                    Due: {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold text-rose-900">
                  {formatCurrency(invoice.total)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {invoices.some((inv) => inv.status === "SENT") && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Pending Invoices
          </p>
          {invoices
            .filter((inv) => inv.status === "SENT")
            .map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-100 p-3"
              >
                <div className="flex-1">
                  <span className="font-mono text-sm font-semibold text-amber-900">
                    {invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
                  </span>
                  {invoice.dueDate && (
                    <p className="mt-1 text-xs text-amber-700">
                      Due: {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-amber-900">
                    {formatCurrency(invoice.total)}
                  </p>
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
