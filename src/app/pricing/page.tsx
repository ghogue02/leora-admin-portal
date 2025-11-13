import { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import clsx from "clsx";
import { LaunchCountdown } from "./components/LaunchCountdown";
import { PricingTabsClient } from "./components/PricingTabsClient";
import {
  ExampleScenario,
  Plan,
  PricingFeatureCategory,
  PricingTab,
  SimplifiedPlan,
  SimplifiedSupplierPlan,
  SupplierFaq,
  SupplierTier,
} from "./types";

export const metadata: Metadata = {
  title: "Pricing | Leora",
  description:
    "Flat wholesaler plans that scale on usage plus supplier analytics priced per connection. No per-seat licensing or heavy implementation fees.",
};

const FOUNDING_SLOT_LIMIT = 20;
const LAUNCH_END_DATE = "2025-06-30T23:59:59Z";

const foundingCommitments = [
  "Enable supplier data sharing within 60 days so the flywheel spins fast.",
  "Join one 30-minute roadmap / telemetry session with us each month.",
  "Let us share anonymized outcomes (or a light case study) after go-live.",
];

const foundingPerks = [
  "Launch pricing locked for 12 months ($100 / $250 / $400).",
  "Concierge data import + workflow wiring included.",
  "Priority access to automation recipes and forecasting pilots.",
];

const resolvedSlotsRemaining = (() => {
  const envValue = Number(process.env.NEXT_PUBLIC_FOUNDING_SLOTS_REMAINING ?? "");
  if (Number.isFinite(envValue)) {
    return Math.max(0, Math.min(FOUNDING_SLOT_LIMIT, Math.floor(envValue)));
  }
  return FOUNDING_SLOT_LIMIT;
})();

const foundingSlots = {
  remaining: resolvedSlotsRemaining,
  claimed: FOUNDING_SLOT_LIMIT - resolvedSlotsRemaining,
  progressPercent: Math.min(100, Math.max(0, ((FOUNDING_SLOT_LIMIT - resolvedSlotsRemaining) / FOUNDING_SLOT_LIMIT) * 100)),
};

const wholesalerPlans: Plan[] = [
  {
    name: "Silver",
    price: "$400",
    discountedPrice: "$340/mo",
    discountNote: "with supplier incentive discount",
    annualPrice: "$4,800/yr",
    frequency: "/mo",
    tagline: "Modern CRM + goals for lean teams",
    description: "Core CRM, call plans, purchasing basics, and sample tracking for smaller orgs.",
    fit: "Single-market distributors or teams under 10 reps.",
    entitlements: [
      { label: "Integrations", value: "1 (ERP or email/calendar)" },
      { label: "Data refresh", value: "Daily syncs" },
      { label: "AI task credits", value: "500 / month" },
      { label: "SMS credits", value: "500 / month" },
    ],
    categories: [
      {
        label: "Customer operating system",
        items: [
          "Account workspaces with activity + supplier timelines",
          "Goals dashboard and call plan tracker",
          "Portfolio search, scheduling, and sample logging",
          "Email sync so notes live next to orders",
        ],
      },
      {
        label: "Data & visibility",
        items: [
          "Leakage snapshots and goal vs. actual scoreboards",
          "Order cost workbook with export-ready views",
          "Supplier readouts for in-flight programs",
        ],
      },
      {
        label: "Automation & AI",
        items: [
          "500 AI tasks for recaps, enrichment, and quick briefs",
          "Reminder nudges powered by the task board",
          "Launch Concierge playbooks ready on day one",
        ],
      },
    ],
    overages: [
      "+$150/mo per additional integration",
      "+$100/mo to move this tenant to hourly refresh",
      "+$15 per additional 1k AI tasks",
      "SMS at pass-through + small margin",
    ],
    ctaLabel: "Get Started",
    ctaHref: "mailto:hello@joinleora.com?subject=Get%20started%20with%20Leora%20Silver",
  },
  {
    name: "Gold",
    price: "$650",
    discountedPrice: "$552.50/mo",
    discountNote: "with supplier incentive discount",
    annualPrice: "$7,800/yr",
    frequency: "/mo",
    tagline: "Multi-market automation & analytics",
    description: "Hourly syncs, automation triggers, and stronger purchasing + CRM controls.",
    fit: "Regional wholesalers with 2+ markets or 10-25 reps.",
    entitlements: [
      { label: "Integrations", value: "2 (ERP + marketing/data warehouse)" },
      { label: "Data refresh", value: "Hourly" },
      { label: "AI task credits", value: "2,000 / month" },
      { label: "SMS credits", value: "2,000 / month" },
    ],
    categories: [
      {
        label: "Customer operating system",
        items: [
          "Everything in Silver plus territory coverage heatmaps",
          "Task board with priorities, due dates, and owners",
          "Sample program with claim tracking and fulfillment checks",
          "Shared calendar views for ride-alongs and events",
        ],
      },
      {
        label: "Data & visibility",
        items: [
          "Leakage + attrition diagnostics by supplier and chain",
          "Trend explorer with hourly refresh + projections",
          "Advanced analytics tiles covering mix, coverage, and fulfillment health",
        ],
      },
      {
        label: "Automation & AI",
        items: [
          "2,000 AI credits for prep, targeting, and opportunity scoring",
          "2,000 SMS credits for compliant follow-ups",
          "Automation triggers when samples or goals slip",
          "Supplier scorecards auto-generated before QBRs",
        ],
      },
    ],
    overages: [
      "+$150/mo per additional integration beyond the included two",
      "+$15 per additional 1k AI tasks",
      "SMS at pass-through + small margin",
    ],
    badge: "Most popular",
    recommended: true,
    ctaLabel: "Request Demo",
    ctaHref: "mailto:hello@joinleora.com?subject=Leora%20Gold%20demo",
  },
  {
    name: "Platinum",
    price: "$950",
    discountedPrice: "$807.50/mo",
    discountNote: "with supplier incentive discount",
    annualPrice: "$11,400/yr",
    frequency: "/mo",
    tagline: "Forecasting, purchasing, and automation recipes",
    description: "Near real-time forecasting cockpit, purchasing workflows, and managed automations.",
    fit: "Enterprise wholesalers or multi-state networks.",
    entitlements: [
      { label: "Integrations", value: "4 (ERP, finance, supplier portals, etc.)" },
      { label: "Data refresh", value: "Near real time (15-minute intervals)" },
      { label: "AI task credits", value: "5,000 / month" },
      { label: "SMS credits", value: "5,000 / month" },
    ],
    categories: [
      {
        label: "Customer operating system",
        items: [
          "Purchasing + forecasting workspace with scenario planning",
          "Supplier analytics controls with granular permissions",
          "Automation recipes (auto follow-ups, target lists, churn alerts)",
          "Multi-integration routing across ERP, finance, and supplier portals",
        ],
      },
      {
        label: "Data & visibility",
        items: [
          "Near real-time telemetry plus anomaly alerts",
          "Merchandising checklists and compliance reporting",
          "Executive rollups comparing forecast vs. purchase orders",
        ],
      },
      {
        label: "Automation & AI",
        items: [
          "5,000 AI credits for forecasting, playbook drafting, and supplier requests",
          "Automation recipes maintained by Leora (auto tasks, SMS, reminders)",
          "Workflow pushbacks and API/export for supplier systems",
        ],
      },
    ],
    overages: [
      "+$150/mo per integration beyond the four included",
      "Custom data-refresh SLAs priced by tenant if under 15 minutes",
      "+$15 per additional 1k AI tasks, SMS at pass-through + small margin",
    ],
    ctaLabel: "Talk to Sales",
    ctaHref: "mailto:hello@joinleora.com?subject=Leora%20Platinum%20conversation",
  },
];

const supplierTiers: SupplierTier[] = [
  {
    name: "Viewer",
    price: "$49 / month",
    latency: "7-day delay",
    includes: [
      "Inventory + depletion views",
      "Scheduled digests + PDF exports",
      "Default permissions scoped by wholesaler",
    ],
    bestFor: "Trade marketing teams that only need read-only visibility.",
  },
  {
    name: "Insights",
    price: "$149 / month",
    latency: "24h / hourly",
    includes: [
      "Everything in Viewer",
      "Rep-level and placement data",
      "Leakage + attrition drilldowns",
    ],
    bestFor: "Supplier revenue, analytics, and RTM teams balancing multiple wholesalers.",
  },
  {
    name: "Actions",
    price: "$299 / month",
    latency: "Near real time",
    includes: [
      "Everything in Insights",
      "Sampling impact + prescriptive recs",
      "Workflow pushbacks + API/export",
    ],
    bestFor: "Brands that want Leora to drive action (auto tasks, data shares).",
  },
];

const implementationHighlights = [
  {
    title: "Launch Concierge (included)",
    detail: "Data import, mapping, permissions, and workflow wiring with a tight scope so you can be live in under a week.",
  },
  {
    title: "Data Lift Assist (optional)",
    detail: "$499 one-time when a wholesaler asks us to clean legacy spreadsheets or rebuild supplier hierarchies.",
  },
  {
    title: "Change enablement",
    detail: "Sample decks, portal training video, and template automations so your reps know exactly what to do on day one.",
  },
];

const flywheelCredits = [
  {
    title: "Supplier data credit",
    detail:
      "If you opt in to supplier data sharing, we credit 15% off your Leora plan price every month (e.g., Silver drops from $400 to $340). Suppliers still pay their own Viewer/Insights/Actions fees.",
  },
  {
    title: "Default access with a timer",
    detail: "Any supplier a wholesaler invites lands in Viewer for 30 days, then receives nurture emails to upgrade.",
  },
];

const guardrails = [
  {
    title: "Usage knobs customers accept",
    detail:
      "Integrations, refresh speed, AI tasks, SMS volume, and automation recipes scale with complexity, not headcount.",
  },
  {
    title: "Latency controls",
    detail:
      "Delayed data (7-day) is the default for suppliers. Near real time is a conscious upgrade a wholesaler approves.",
  },
  {
    title: "Fair-use boundaries",
    detail:
      "Each plan includes up to 200k account-level events per month. Beyond that we open a conversation instead of throttling.",
  },
];

const faqs = [
  {
    question: "Is there any setup or implementation fee?",
    answer: "No. Launch Concierge is included on every plan. We only charge the optional $499 Data Lift Assist if you ask us to clean legacy spreadsheets or rebuild supplier hierarchies.",
  },
  {
    question: "Can we switch plans as our team grows?",
    answer: "Yes. Move between Silver, Gold, and Platinum any time. Usage entitlements such as integrations, refresh rate, and automation credits update instantly.",
  },
  {
    question: "How do supplier analytics fees get billed?",
    answer: "Suppliers pay per connection per month with volume discounts. When you share data, we credit 15% off your Leora plan price—you are never paying their fees.",
  },
  {
    question: "Do you offer annual billing or discounts?",
    answer: "Annual pricing is shown next to every plan. We can invoice annually or monthly depending on your procurement process.",
  },
];

const pricingFeatures: PricingFeatureCategory[] = [
  {
    category: "Core pricing",
    features: [
      {
        name: "Launch-year cost (Founding 20)",
        Silver: "$100/mo (first 12 months)",
        Gold: "$250/mo (first 12 months)",
        Platinum: "$400/mo (first 12 months)",
        type: "pricing",
      },
      {
        name: "Monthly cost",
        Silver: "$400/mo",
        Gold: "$650/mo",
        Platinum: "$950/mo",
        type: "pricing",
      },
    ],
  },
  {
    category: "Sales workspace",
    features: [
      {
        name: "CRM + task board",
        Silver: "Pipeline, call plans, overdue alerts",
        Gold: "Adds manager rollups",
        Platinum: "Adds SLA routing + territory filters",
        type: "value",
      },
      {
        name: "Team calendar & ride-alongs (Q2)",
        Silver: "Optional beta",
        Gold: "Included",
        Platinum: "Included + territory filters",
        type: "value",
      },
    ],
  },
  {
    category: "Samples & purchasing",
    features: [
      {
        name: "Sample logging + ROI view",
        Silver: "Logging + exports",
        Gold: "Logging + auto follow-ups",
        Platinum: "Logging + budgets/approvals & exec rollups",
        type: "value",
      },
      {
        name: "Purchasing & forecast workspace",
        Silver: false,
        Gold: "Basic purchasing + order guardrails",
        Platinum: "Scenario planning + anomaly alerts",
        type: "value",
      },
    ],
  },
  {
    category: "Automations & alerts",
    features: [
      {
        name: "Triggers (samples, first orders, burn rate)",
        Silver: "Manual reminders",
        Gold: "Auto task creation",
        Platinum: "Auto + purchasing & compliance triggers",
        type: "value",
      },
      {
        name: "Managed automation recipes",
        Silver: false,
        Gold: false,
        Platinum: true,
        type: "boolean",
      },
    ],
  },
  {
    category: "Data refresh & allowances",
    features: [
      {
        name: "Integrations included",
        Silver: "1 (ERP or email/calendar)",
        Gold: "2 (ERP + marketing/data warehouse)",
        Platinum: "4 (ERP, finance, supplier portals, etc.)",
        type: "value",
      },
      {
        name: "Data refresh cadence",
        Silver: "Daily syncs",
        Gold: "Hourly",
        Platinum: "Near real-time (15-minute intervals)",
        type: "progressive",
      },
      {
        name: "AI task credits",
        Silver: "500 / month",
        Gold: "2,000 / month",
        Platinum: "5,000 / month",
        type: "quantity",
      },
      {
        name: "SMS credits",
        Silver: "500 / month",
        Gold: "2,000 / month",
        Platinum: "5,000 / month",
        type: "quantity",
      },
    ],
  },
];

const simplifiedWholesalerPlans: SimplifiedPlan[] = [
  {
    id: "silver",
    name: "Silver",
    price: "$400",
    priceInterval: "/mo",
    launchPrice: "$100/mo (first 12 months)",
    launchNote: "Founding 20 pricing · Reverts to $400/mo at renewal with 15% supplier credit once data sharing is on.",
    discountedPrice: "$340/mo",
    discountNote: "with supplier incentive discount",
    badge: null,
    tagline: "For lean teams",
    description: "CRM, call plans, purchasing basics, and sample tracking out of the box.",
    keyDifferentiators: [
      { icon: "refresh", label: "Daily syncs + goals", detail: "Call plan + goal dashboards stay current without spreadsheets" },
      { icon: "link", label: "Task management", detail: "Auto-prioritized tasks with overdue nudges" },
      { icon: "sparkles", label: "Sample tracking", detail: "Log tastings, capture feedback, see what converts" },
    ],
    bestFor: "Single-market distributors or teams under 10 reps",
  },
  {
    id: "gold",
    name: "Gold",
    price: "$650",
    priceInterval: "/mo",
    launchPrice: "$250/mo (first 12 months)",
    launchNote: "Founding 20 pricing · Reverts to $650/mo at renewal; keep 15% off with supplier sharing.",
    discountedPrice: "$552.50/mo",
    discountNote: "with supplier incentive discount",
    badge: "Most popular",
    badgeColor: "#5b5bff",
    tagline: "For regional teams",
    description: "Hourly syncs, automation triggers, and multi-market purchasing visibility.",
    keyDifferentiators: [
      { icon: "clock", label: "Hourly data syncs", detail: "Leakage + attrition watchlist stays current all day" },
      { icon: "sparkles", label: "Automation triggers", detail: "Samples, first orders, burn-rate dips create tasks automatically" },
      { icon: "link", label: "Team calendar (Q2)", detail: "Ride-alongs + supplier invites from the same view" },
    ],
    bestFor: "Regional wholesalers with 2+ markets or 10-25 reps",
  },
  {
    id: "platinum",
    name: "Platinum",
    price: "$950",
    priceInterval: "/mo",
    launchPrice: "$400/mo (first 12 months)",
    launchNote: "Founding 20 pricing · Reverts to $950/mo; supplier sharing keeps the 15% credit.",
    discountedPrice: "$807.50/mo",
    discountNote: "with supplier incentive discount",
    badge: null,
    tagline: "For enterprises",
    description: "Near real-time forecasting, purchasing workflows, and managed automations.",
    keyDifferentiators: [
      { icon: "bolt", label: "15-minute syncs", detail: "Forecast cockpit with instant anomaly alerts" },
      { icon: "network", label: "4 integrations", detail: "ERP, finance, supplier portals, and warehouse data" },
      { icon: "sparkles", label: "Managed recipes", detail: "Automation playbooks maintained by Leora" },
    ],
    bestFor: "Enterprise wholesalers or multi-state networks",
  },
];

const simplifiedSupplierPlans: SimplifiedSupplierPlan[] = [
  {
    id: "viewer",
    name: "Viewer",
    price: "$49",
    priceInterval: "/month",
    latency: "7-day delay",
    latencyLabel: "Best for read-only access",
    keyFeatures: ["Inventory + depletion views", "Scheduled digests & PDF exports", "Default wholesaler permissions"],
    bestFor: "Trade marketing teams needing read-only visibility (first 30 days free when invited)",
    upgrade: null,
  },
  {
    id: "insights",
    name: "Insights",
    price: "$149",
    priceInterval: "/month",
    latency: "24h / Hourly refresh",
    latencyLabel: "Best for balanced insights",
    keyFeatures: [
      "Everything in Viewer",
      "Rep-level & placement data",
      "Leakage + attrition drilldowns",
    ],
    bestFor: "Supplier revenue & analytics teams across multiple wholesalers",
    upgrade: null,
  },
  {
    id: "actions",
    name: "Actions",
    price: "$299",
    priceInterval: "/month",
    latency: "Near real-time",
    latencyLabel: "Best for driving action",
    keyFeatures: ["Everything in Insights", "Sampling impact & prescriptive recs", "Workflow pushbacks + API/export"],
    bestFor: "Brands that want Leora driving action (auto tasks, data shares)",
    upgrade: null,
  },
];

const pricingTabs: PricingTab[] = [
  {
    id: "wholesaler",
    label: "Wholesaler plans",
    icon: "building",
    description: "Pricing for your team",
  },
  {
    id: "supplier",
    label: "Supplier analytics",
    icon: "chart",
    description: "Pricing for your suppliers",
  },
];

const exampleScenarios: ExampleScenario[] = [
  {
    title: "Gold plan with data sharing enabled",
    bullets: [
      "Gold plan price: $650/mo",
      "Supplier data credit (15%): -$97.50/mo",
      "Net bill with data sharing: ~$552.50/mo (~$6,630/yr)",
      "Suppliers still pay for Insights/Actions directly; the credit only reduces your plan price.",
    ],
  },
  {
    title: "Platinum plan with data sharing",
    bullets: [
      "Platinum plan price: $950/mo",
      "Supplier data credit (15%): -$142.50/mo",
      "Net bill with data sharing: ~$807.50/mo (~$9,690/yr)",
      "Suppliers choose Viewer/Insights/Actions tiers and are invoiced separately.",
    ],
  },
  {
    title: "Launch pricing + supplier credit",
    bullets: [
      "Silver launch price: $100/mo for the first 12 months (Founding 20 only).",
      "Share supplier data within 60 days and keep the 15% credit when you roll to $400/mo.",
      "Launch pricing requires monthly feedback so we can prioritize automations and supplier workflows.",
    ],
  },
];

const supplierFaqs: SupplierFaq[] = [
  {
    question: "How do suppliers upgrade their tier?",
    answer: "Suppliers can upgrade inside their portal at any time. As long as you keep sharing data, your 15% plan credit stays active regardless of which tiers they choose.",
  },
  {
    question: "Can we invite suppliers to a trial?",
    answer: "Yes. Every supplier you invite lands in Viewer free for 30 days with 7-day delayed data. Upgrade nudges run automatically.",
  },
  {
    question: "What are the fair-use boundaries?",
    answer: "Viewer includes delayed dashboards and exports. Insights adds hourly refresh and analytics workloads, while Actions covers API/export usage and workflow pushbacks with defined burst limits.",
  },
];

const pricingStrategies = [
  {
    title: "Adoption-first (current focus)",
    badge: "Current focus",
    description:
      "Recruit the Founding 20 wholesalers, keep friction low with $100 launch pricing, and prove the supplier flywheel before scaling price.",
    bullets: [
      "Launch pricing: Silver $100/mo, Gold $250/mo, Platinum $400/mo for the first 12 months (limited to 20 wholesalers).",
      "Supplier data credit: once Viewer or Insights is on, invoices auto-drop 15% even after launch pricing expires.",
      "Telemetry expectation: monthly feedback + supplier invites within 60 days give us proof before renewal.",
    ],
  },
  {
    title: "Automation Plus add-on (optional)",
    description:
      "Once early adopters want more hands-on help, layer an add-on instead of raising base price.",
    bullets: [
      "Automation Plus (+$250/mo): managed trigger tuning, QA, and 2 hrs/mo of Success time.",
      "Great for multi-market teams that want guarantees without rethinking pricing.",
      "Keep supplier credit + free Viewer invites so the adoption motion stays intact.",
    ],
  },
  {
    title: "Enterprise uplift",
    description:
      "For multi-state groups that need near real-time forecasting, purchasing approvals, and managed automations with SLAs.",
    bullets: [
      "Platinum becomes the base; we scope success/advisory retainers on top (forecast workshops, purchasing reviews).",
      "Supplier data credit still applies, but ROI stories lean on purchasing + forecasting visibility.",
      "Ready once supplier collaboration tools are fully live (target six weeks).",
    ],
  },
  {
    title: "Supplier collaboration track",
    description:
      "Plan the shared supplier workspace rollout: Viewer → Insights → Actions with shared scorecards, tasks, and timelines.",
    bullets: [
      "Viewer always free for 30 days; Insights/Actions billed to suppliers with volume discounts.",
      "Roadmap: shared scorecards, supplier-triggered tasks, and invite workflows already wired into Leora.",
      "Messaging: \"Leora connects it all\"—wholesalers control the data, suppliers pay for deeper action.",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="safe-nav-offset pb-16">
      <section className="layout-shell">
        <div className="rounded-[32px] border border-white/10 bg-slate-900 px-8 py-12 text-white shadow-[0_25px_70px_rgba(15,23,42,0.4)]">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-white/90">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Launch pricing
            </span>
            <span className="text-white/70">
              {foundingSlots.remaining} of {FOUNDING_SLOT_LIMIT} slots remaining
            </span>
            <span className="text-white/70">
              Ends in <LaunchCountdown endDate={LAUNCH_END_DATE} />
            </span>
          </div>
          <div className="mt-6 max-w-3xl space-y-4">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">Pricing that keeps your team moving.</h1>
            <p className="text-lg text-white/80">
              Leora connects CRM, purchasing, automation, and supplier collaboration in one system. Launch pricing keeps friction low so we can ship value,
              collect telemetry, and invite suppliers faster.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="mailto:hello@joinleora.com?subject=Founding%2020%20application"
              className="flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg transition hover:bg-amber-300 focus-visible:outline-white/80"
            >
              Apply for launch pricing
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="#founding"
              className="rounded-full border border-white/40 px-6 py-3 text-base font-medium text-white transition hover:bg-white/10"
            >
              See cohort criteria
            </Link>
            <Link
              href="#wholesaler"
              className="rounded-full border border-transparent px-6 py-3 text-base font-medium text-white/70 transition hover:bg-white/10"
            >
              Compare plans
            </Link>
          </div>
          <div className="mt-10 grid gap-6 text-sm text-white/70 md:grid-cols-3">
            <div>
              <p className="font-semibold text-white">Launch Concierge</p>
              <p>Included onboarding for data import, mapping, and permissions so you go live fast.</p>
            </div>
            <div>
              <p className="font-semibold text-white">Usage-based scale</p>
              <p>Add integrations, faster refresh, or credits whenever your operation needs it.</p>
            </div>
            <div>
              <p className="font-semibold text-white">Supplier flywheel</p>
              <p>Suppliers choose their analytics tier once the data is live—you see 15% credits automatically.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="founding" className="layout-shell mt-8">
        <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">Founding 20 launch cohort</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-900">First {FOUNDING_SLOT_LIMIT} wholesalers lock $100 launch pricing</h2>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">Launch pricing</span>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Pay $100 / $250 / $400 per month for your first year, then revert to list price with the 15% supplier data credit available forever. We only ask
            for fast feedback so the supplier experience compounds.
          </p>
          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              <span>
                {foundingSlots.claimed} / {FOUNDING_SLOT_LIMIT} claimed
              </span>
              <span>{foundingSlots.remaining} spots left</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-indigo-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${foundingSlots.progressPercent}%` }}
              />
            </div>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Commitments</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {foundingCommitments.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-indigo-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Perks</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {foundingPerks.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">Auto discount:</span>
            <span>Share data within 60 days and the 15% supplier credit stays on your invoice long term.</span>
          </div>
        </div>
      </section>

      <section className="layout-shell mt-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Strategy snapshots</p>
        <h2 className="mt-2 text-2xl font-semibold text-gray-900">How we price for adoption now and optional uplifts later</h2>
        <p className="mt-2 text-sm text-gray-600">
          Adoption-first is our north star. The cards below capture the current focus plus optional levers once we hit scale.
        </p>
        {pricingStrategies.length > 0 ? (
          <>
            <StrategyCard strategy={pricingStrategies[0]} primary />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {pricingStrategies.slice(1).map((strategy) => (
                <StrategyCard key={strategy.title} strategy={strategy} />
              ))}
            </div>
          </>
        ) : null}
      </section>

      <PricingTabsClient
        tabs={pricingTabs}
        simplifiedWholesalerPlans={simplifiedWholesalerPlans}
        simplifiedSupplierPlans={simplifiedSupplierPlans}
        wholesalerPlans={wholesalerPlans}
        supplierTiers={supplierTiers}
        pricingFeatures={pricingFeatures}
        implementationHighlights={implementationHighlights}
        flywheelCredits={flywheelCredits}
        guardrails={guardrails}
        faqs={faqs}
        exampleScenarios={exampleScenarios}
        supplierFaqs={supplierFaqs}
      />
    </div>
  );
}

function StrategyCard({
  strategy,
  primary,
}: {
  strategy: {
    title: string;
    description: string;
    bullets: string[];
    badge?: string;
  };
  primary?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-3xl border p-6 shadow-sm",
        primary ? "border-indigo-400 bg-indigo-50/80" : "border-gray-200 bg-white"
      )}
    >
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-900">{strategy.title}</h3>
        {strategy.badge ? (
          <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            {strategy.badge}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-gray-600">{strategy.description}</p>
      <ul className="mt-4 space-y-2 text-sm text-gray-800">
        {strategy.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className="text-indigo-500">•</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
