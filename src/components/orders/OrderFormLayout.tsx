"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ButtonWithLoading } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

export type OrderSectionKey = "customer" | "delivery" | "products";

export type OrderAccordionStatus = {
  label: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

type OrderAccordionSectionProps = {
  title: string;
  description?: string;
  status?: OrderAccordionStatus;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

const STATUS_STYLES: Record<OrderAccordionStatus["tone"], string> = {
  neutral: "border border-slate-200 bg-slate-100 text-slate-700",
  success: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border border-amber-200 bg-amber-50 text-amber-700",
  danger: "border border-rose-200 bg-rose-50 text-rose-700",
};

export function OrderAccordionSection({
  title,
  description,
  status,
  isOpen,
  onToggle,
  children,
}: OrderAccordionSectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm transition",
        isOpen ? "ring-1 ring-slate-200" : "opacity-95",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left focus:outline-none"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {description ? <p className="text-sm text-gray-600">{description}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {status ? (
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_STYLES[status.tone])}>
              {status.label}
            </span>
          ) : null}
          <ChevronDown
            className={cn("h-4 w-4 text-gray-500 transition-transform", isOpen ? "rotate-180" : "rotate-0")}
          />
        </div>
      </button>
      <div className={cn("px-6 pb-6 pt-0", isOpen ? "block" : "hidden")}>{children}</div>
    </section>
  );
}

type OrderActionFooterProps = {
  total: number;
  requiresApproval: boolean;
  issuesCount: number;
  isFormValid: boolean;
  submitting: boolean;
  primaryLabel: string;
  cancelHref?: string;
  loadingText?: string;
  issueMessage?: string;
};

export function OrderActionFooter({
  total,
  requiresApproval,
  issuesCount,
  isFormValid,
  submitting,
  primaryLabel,
  cancelHref = "/sales/orders",
  loadingText = "Saving...",
  issueMessage,
}: OrderActionFooterProps) {
  const computedIssueMessage =
    issueMessage ??
    (issuesCount > 0
      ? `${issuesCount} ${issuesCount === 1 ? "issue" : "issues"} to review`
      : requiresApproval
        ? "Routes for manager approval"
        : "Ready to submit");
  const issueTone =
    issuesCount > 0 ? "text-rose-600" : requiresApproval ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="sticky bottom-0 left-0 right-0 mt-8 border-t border-slate-200 bg-white/95 px-4 py-4 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated total</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(total)}</p>
          <p className={cn("text-xs font-semibold", issueTone)}>{computedIssueMessage}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={cancelHref}
            className="touch-target rounded-md border border-slate-300 px-5 py-2 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <ButtonWithLoading
            type="submit"
            loading={submitting}
            loadingText={loadingText}
            variant="primary"
            size="lg"
            disabled={!isFormValid || submitting}
            className="touch-target"
          >
            {primaryLabel}
          </ButtonWithLoading>
        </div>
      </div>
    </div>
  );
}
