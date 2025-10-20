'use client';

import { format } from "date-fns";
import { useState } from "react";

type Order = {
  id: string;
  orderedAt: string | null;
  deliveredAt: string | null;
  status: string;
  total: number;
  lineCount: number;
  invoices: {
    id: string;
    invoiceNumber: string | null;
    status: string;
    total: number;
    issuedAt: string | null;
  }[];
};

type OrderHistoryProps = {
  orders: Order[];
};

export default function OrderHistory({ orders }: OrderHistoryProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "FULFILLED":
        return "bg-green-100 text-green-700 border-green-200";
      case "CANCELLED":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "PARTIALLY_FULFILLED":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-700";
      case "SENT":
        return "bg-blue-100 text-blue-700";
      case "OVERDUE":
        return "bg-rose-100 text-rose-700";
      case "VOID":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
          <p className="text-xs text-gray-500">Complete order history with invoices</p>
        </div>
        <div className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
          {orders.length} Orders
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-gray-500">No order history</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-slate-200 bg-slate-50"
            >
              <button
                onClick={() => toggleOrder(order.id)}
                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-100"
              >
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {order.id.slice(0, 8)}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {order.lineCount} items
                      {order.deliveredAt &&
                        ` - Delivered ${format(
                          new Date(order.deliveredAt),
                          "MMM d, yyyy"
                        )}`}
                      {!order.deliveredAt &&
                        order.orderedAt &&
                        ` - Ordered ${format(
                          new Date(order.orderedAt),
                          "MMM d, yyyy"
                        )}`}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(order.total)}
                    </p>
                    {order.invoices.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {order.invoices.length} invoice
                        {order.invoices.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <svg
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      expandedOrderId === order.id ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {expandedOrderId === order.id && order.invoices.length > 0 && (
                <div className="border-t border-slate-200 bg-white p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Invoices
                  </h4>
                  <div className="mt-2 space-y-2">
                    {order.invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-gray-900">
                              {invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getInvoiceStatusBadge(
                                invoice.status
                              )}`}
                            >
                              {invoice.status}
                            </span>
                          </div>
                          {invoice.issuedAt && (
                            <p className="mt-1 text-xs text-gray-500">
                              Issued {format(new Date(invoice.issuedAt), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(invoice.total)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
