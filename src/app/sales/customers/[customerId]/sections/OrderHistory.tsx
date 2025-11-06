'use client';

import { format } from "date-fns";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Order = {
  id: string;
  orderNumber: string | null;
  orderedAt: string | null;
  deliveredAt: string | null;
  status: string;
  total: number;
  lineCount: number;
  lines: {
    id: string;
    quantity: number;
    unitPrice: number;
    sku: {
      code: string;
      product: {
        id: string;
        name: string;
        brand: string | null;
      } | null;
    } | null;
  }[];
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
  customerId?: string;
  isCompact?: boolean;
};

export default function OrderHistory({ orders, customerId, isCompact = false }: OrderHistoryProps) {
  const router = useRouter();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Show only last 5 orders in compact mode
  const displayOrders = isCompact ? orders.slice(0, 5) : orders;

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

  const handleRowClick = (orderId: string) => {
    router.push(`/sales/orders/${orderId}`);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isCompact ? "Recent Orders" : "Order History"}
          </h2>
          <p className="text-xs text-gray-500">
            {isCompact ? "Last 5 orders" : "Complete order history with invoices"}
          </p>
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
          {displayOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-slate-200 bg-slate-50"
            >
              <div
                onClick={() => isCompact ? handleRowClick(order.id) : toggleOrder(order.id)}
                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-100 cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    isCompact ? handleRowClick(order.id) : toggleOrder(order.id);
                  }
                }}
              >
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/sales/orders/${order.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {order.orderNumber || `#${order.id.slice(0, 8)}`}
                      </Link>
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

                  {!isCompact && (
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
                  )}
                </div>
              </div>

              {!isCompact && expandedOrderId === order.id && (
                <div className="border-t border-slate-200 bg-white p-4">
                  {/* Order Line Items */}
                  {order.lines && order.lines.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
                        Order Items
                      </h4>
                      <div className="space-y-1">
                        {order.lines.map((line) => (
                          <div
                            key={line.id}
                            className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm"
                          >
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">
                                {line.sku?.product?.name || 'Unknown Product'}
                              </span>
                              {line.sku?.product?.brand && (
                                <span className="ml-2 text-xs text-gray-500">
                                  {line.sku.product.brand}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              <span className="text-gray-600">
                                Qty: {line.quantity}
                              </span>
                              <span className="font-semibold text-gray-900 min-w-[80px]">
                                {formatCurrency(line.quantity * line.unitPrice)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoices */}
                  {order.invoices.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
                        Invoices
                      </h4>
                      <div className="space-y-2">
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
              )}
            </div>
          ))}
        </div>
      )}

      {/* View All Orders Link - shown only in compact mode */}
      {isCompact && orders.length > 5 && customerId && (
        <div className="mt-4 text-center">
          <Link
            href={`/sales/customers/${customerId}`}
            onClick={() => {
              // Scroll to full order history section after navigation
              setTimeout(() => {
                const orderHistorySection = document.querySelector('h2:contains("Order History")');
                orderHistorySection?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            View All {orders.length} Orders
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </section>
  );
}
