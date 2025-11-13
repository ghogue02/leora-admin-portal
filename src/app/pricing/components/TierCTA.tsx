"use client";

import Link from "next/link";
import clsx from "clsx";
import { CTA_CONFIG, TIER_CTA_INTENT } from "../config/cta";
import type { CTAIntent } from "../config/cta";

type TierCTAProps = {
  tierId: "silver" | "gold" | "platinum";
  variant?: "card" | "grid" | "mobile";
  location: string;
};

const variantClasses: Record<NonNullable<TierCTAProps["variant"]>, string> = {
  card: "w-full rounded-2xl px-4 py-3 text-sm",
  grid: "w-full rounded-full px-4 py-2 text-xs",
  mobile: "w-full rounded-full px-5 py-3 text-base",
};

export function TierCTA({ tierId, variant = "card", location }: TierCTAProps) {
  const intent = TIER_CTA_INTENT[tierId];
  const config = CTA_CONFIG[intent];

  return (
    <Link
      href={config.destination}
      aria-label={`${config.text} for ${tierId}`}
      className={clsx(
        "inline-flex items-center justify-center font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        variantClasses[variant],
        buttonPalette(intent)
      )}
      title={config.tooltip}
      onClick={() => trackCTAClick(tierId, intent, location)}
    >
      {config.text}
    </Link>
  );
}

function buttonPalette(intent: CTAIntent) {
  switch (intent) {
    case "SELF_SERVE":
      return "bg-indigo-500 text-white shadow-md hover:bg-indigo-400 focus-visible:outline-indigo-500";
    case "DEMO_NEEDED":
      return "bg-amber-400 text-slate-900 shadow-md hover:bg-amber-300 focus-visible:outline-amber-400";
    case "SALES_CALL":
      return "bg-gray-900 text-white hover:bg-gray-800 focus-visible:outline-gray-900";
    default:
      return "";
  }
}

function trackCTAClick(tier: string, intent: CTAIntent, location: string) {
  if (typeof window === "undefined") return;
  if (window?.analytics?.track) {
    window.analytics.track("CTA Clicked", {
      tier,
      intent,
      location,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
  }
}
