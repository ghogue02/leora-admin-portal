'use client';

import Link from "next/link";
import { useParams } from "next/navigation";
import { Pencil } from "lucide-react";

type CustomerHeaderProps = {
  customer: {
    name: string;
    accountNumber: string | null;
    externalId: string | null;
    riskStatus: string;
    phone: string | null;
    billingEmail: string | null;
    licenseNumber: string | null;
    address: {
      street1: string | null;
      street2: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: string | null;
    };
    isPermanentlyClosed: boolean;
    closedReason: string | null;
  };
};

export default function CustomerHeader({ customer }: CustomerHeaderProps) {
  const params = useParams();
  const customerId = params.customerId as string;

  const getRiskBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "bg-green-100 text-green-800 border-green-200";
      case "AT_RISK_CADENCE":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "AT_RISK_REVENUE":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "DORMANT":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "CLOSED":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRiskLabel = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "Healthy";
      case "AT_RISK_CADENCE":
        return "At Risk - Cadence";
      case "AT_RISK_REVENUE":
        return "At Risk - Revenue";
      case "DORMANT":
        return "Dormant";
      case "CLOSED":
        return "Closed";
      default:
        return status;
    }
  };

  const formatAddress = () => {
    const parts = [
      customer.address.street1,
      customer.address.street2,
      [customer.address.city, customer.address.state, customer.address.postalCode]
        .filter(Boolean)
        .join(", "),
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "No address on file";
  };

  return (
    <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-semibold text-gray-900">
              {customer.name}
            </h1>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRiskBadge(
                customer.riskStatus
              )}`}
            >
              {getRiskLabel(customer.riskStatus)}
            </span>
            {customer.isPermanentlyClosed && (
              <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                CLOSED
              </span>
            )}
            <Link
              href={`/sales/customers/${customerId}/edit`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              Edit Customer
            </Link>
          </div>

          <div className="mt-3 grid gap-2 text-sm text-gray-600">
            {customer.accountNumber && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-500">Account #:</span>
                <span className="font-mono">{customer.accountNumber}</span>
              </div>
            )}
            {customer.externalId && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-500">External ID:</span>
                <span className="font-mono">{customer.externalId}</span>
              </div>
            )}
            {customer.licenseNumber && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-500">License #:</span>
                <span className="font-mono">{customer.licenseNumber}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Contact Information
          </p>
          <div className="mt-2 space-y-1 text-sm">
            {customer.billingEmail && (
              <div>
                <span className="font-medium text-gray-900">Email:</span>{" "}
                <a
                  href={`mailto:${customer.billingEmail}`}
                  className="text-blue-600 hover:underline"
                >
                  {customer.billingEmail}
                </a>
              </div>
            )}
            {customer.phone && (
              <div>
                <span className="font-medium text-gray-900">Phone:</span>{" "}
                <a
                  href={`tel:${customer.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {customer.phone}
                </a>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-900">Address:</span>{" "}
              <span className="text-gray-600">{formatAddress()}</span>
            </div>
          </div>
        </div>
      </div>

      {customer.isPermanentlyClosed && customer.closedReason && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <p className="font-semibold">Account Closed</p>
          <p className="mt-1">{customer.closedReason}</p>
        </div>
      )}
    </header>
  );
}
