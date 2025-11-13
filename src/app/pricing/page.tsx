import { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { PricingTabsClient } from "./components/PricingTabsClient";
import {
  ExampleScenario,
  FeatureConfig,
  FeatureType,
  Plan,
  PricingFeatureCategory,
  PricingTab,
  SimplifiedPlan,
  SimplifiedSupplierPlan,
  SupplierDiscount,
  SupplierFaq,
  SupplierTier,
  tierOrder,
} from "./types";

export const metadata: Metadata = {
  title: "Pricing | Leora",
  description:
    "Flat wholesaler plans that scale on usage plus supplier analytics priced per connection. No per-seat licensing or heavy implementation fees.",
};

const wholesalerPlans: Plan[] = [
  {
    name: "Silver",
    price: "$300",
    annualPrice: "$3,600/yr",
    frequency: "/mo",
    tagline: "Modern CRM + goals for lean teams",
    description: "Daily planning, supplier collaboration, and CRM coverage without heavy admin.",
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
    price: "$500",
    annualPrice: "$6,000/yr",
    frequency: "/mo",
    tagline: "Multi-market automation & analytics",
    description: "Hourly data plus automation for regional teams coordinating sampling, suppliers, and task boards.",
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
          "Automation triggers when samples are scanned or goals slip",
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
    price: "$600",
    annualPrice: "$7,200/yr",
    frequency: "/mo",
    tagline: "Forecasting, purchasing, and automation recipes",
    description: "Near real-time data with purchasing, forecasting, and automation recipes built in.",
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
    price: "$49 / connection / mo",
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
    price: "$149 / connection / mo",
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
    price: "$299 / connection / mo",
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
    title: "Sponsorship credit",
    detail:
      "Credit wholesalers 15% of supplier subscription fees on their invoice. You still collect directly from suppliers while wholesalers see Leora paying for itself.",
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

const validationQuestions = [
  "How valuable is 7-day delayed supplier data vs. 24h vs. near real time?",
  "Which additional systems would you pay $150/mo to connect (beyond ERP + email)?",
  "If Leora generated target lists + follow-ups automatically, what monthly value would that unlock?",
  "Would a 15% credit on supplier fees motivate you to invite them sooner?",
  "Do you prefer visible AI/SMS bundles with low overages or 'unlimited with fair use' wording?",
  "What does 'Launch Concierge' need to include so you know there is no hidden setup cost?",
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
    answer: "Suppliers pay per connection per month. Volume discounts start at five connections and wholesalers automatically receive the 15% sponsorship credit on their invoice.",
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
        name: "Monthly cost",
        Silver: "$300",
        Gold: "$500",
        Platinum: "$600",
        type: "pricing",
      },
    ],
  },
  {
    category: "Daily work",
    features: [
      {
        name: "Task board & overdue alerts",
        Silver: "Included",
        Gold: "Includes manager rollups",
        Platinum: "Includes SLA routing",
        type: "value",
      },
      {
        name: "Team calendar (Q2)",
        Silver: "Optional beta",
        Gold: "Included",
        Platinum: "Included + territory filters",
        type: "value",
      },
    ],
  },
  {
    category: "Sample tracking & ROI",
    features: [
      {
        name: "Sample logging & notes",
        Silver: "Log tastings + feedback",
        Gold: "Logging + auto follow-ups",
        Platinum: "Logging + budgets & approvals",
        type: "value",
      },
      {
        name: "Sample → order ROI view",
        Silver: "Exports & cost workbook",
        Gold: "Live dashboards",
        Platinum: "Executive rollups + alerts",
        type: "value",
      },
    ],
  },
  {
    category: "Automations & reminders",
    features: [
      {
        name: "Triggers (samples, first orders, burn rate)",
        Silver: "Manual reminders",
        Gold: "Auto task creation",
        Platinum: "Auto + purchasing/compliance triggers",
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
    category: "Field capture & forecasting",
    features: [
      {
        name: "OCR capture (cards, licenses)",
        Silver: "Manual upload",
        Gold: "Business-card OCR + contact sync",
        Platinum: "OCR + license verification",
        type: "value",
      },
      {
        name: "Purchasing & forecast workspace",
        Silver: false,
        Gold: false,
        Platinum: true,
        type: "boolean",
      },
    ],
  },
  {
    category: "Data refresh & usage entitlements",
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
    price: "$300",
    priceInterval: "/mo",
    badge: null,
    tagline: "For lean teams",
    description: "Day-one workspace with call plans, task lists, and sample tracking.",
    keyDifferentiators: [
      { icon: "refresh", label: "Daily syncs + scoreboards", detail: "Goals dashboard shows progress without spreadsheets" },
      { icon: "link", label: "Task management", detail: "Auto-prioritized tasks with overdue nudges" },
      { icon: "sparkles", label: "Sample intelligence", detail: "Log tastings, capture feedback, see what converts" },
    ],
    bestFor: "Single-market distributors or teams under 10 reps",
  },
  {
    id: "gold",
    name: "Gold",
    price: "$500",
    priceInterval: "/mo",
    badge: "Most popular",
    badgeColor: "#5b5bff",
    tagline: "For regional teams",
    description: "Live data and automated follow-ups so multi-market teams stay ahead.",
    keyDifferentiators: [
      { icon: "clock", label: "Hourly data syncs", detail: "Leakage + attrition watchlist stays current all day" },
      { icon: "sparkles", label: "Automation triggers", detail: "Samples, first orders, burn-rate dips create tasks automatically" },
      { icon: "link", label: "Upcoming calendar (Q2)", detail: "Team calendar with invites + supplier sharing" },
    ],
    bestFor: "Regional wholesalers with 2+ markets or 10-25 reps",
  },
  {
    id: "platinum",
    name: "Platinum",
    price: "$600",
    priceInterval: "/mo",
    badge: null,
    tagline: "For enterprises",
    description: "Near real-time data, purchasing controls, and OCR capture for compliance.",
    keyDifferentiators: [
      { icon: "bolt", label: "15-minute syncs", detail: "Forecast view with instant anomaly alerts" },
      { icon: "network", label: "4 integrations", detail: "ERP, finance, supplier portals, and warehouse data" },
      { icon: "sparkles", label: "OCR + recipes", detail: "Business card + license OCR feeding automation playbooks" },
    ],
    bestFor: "Enterprise wholesalers or multi-state networks",
  },
];

const simplifiedSupplierPlans: SimplifiedSupplierPlan[] = [
  {
    id: "viewer",
    name: "Viewer",
    price: "$49",
    priceInterval: "/connection/mo",
    latency: "7-day delay",
    latencyLabel: "Best for read-only access",
    keyFeatures: ["Inventory + depletion views", "Scheduled digests & PDF exports", "Default wholesaler permissions"],
    bestFor: "Trade marketing teams needing read-only visibility",
    upgrade: "Upgrade to Insights →",
  },
  {
    id: "insights",
    name: "Insights",
    price: "$149",
    priceInterval: "/connection/mo",
    latency: "24h / Hourly refresh",
    latencyLabel: "Best for balanced insights",
    keyFeatures: [
      "Everything in Viewer",
      "Rep-level & placement data",
      "Leakage + attrition drilldowns",
    ],
    bestFor: "Supplier revenue & analytics teams across multiple wholesalers",
    upgrade: "Upgrade to Actions →",
  },
  {
    id: "actions",
    name: "Actions",
    price: "$299",
    priceInterval: "/connection/mo",
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
    title: "Gold wholesaler + 10 supplier Insights connections",
    bullets: [
      "Wholesaler plan: $500/mo (Gold)",
      "Supplier fees: 10 x $149 = $1,490/mo",
      "15% wholesaler credit applied: -$223.50",
      "Net monthly total: $1,766.50 (~$21,198/yr)",
    ],
  },
  {
    title: "Platinum wholesaler + 20 Action connections",
    bullets: [
      "Wholesaler plan: $600/mo (Platinum)",
      "Supplier fees: 20 x $299 = $5,980/mo",
      "Volume discount: 20% off supplier spend = -$1,196",
      "15% wholesaler credit on net supplier spend = -$717.60",
      "Net monthly total: $4,666.40 (~$55,996/yr)",
    ],
  },
];

const supplierDiscounts: SupplierDiscount[] = [
  { range: "5-20 connections", discount: "10% discount" },
  { range: "21-50 connections", discount: "20% discount" },
  { range: "51+ connections", discount: "30% discount" },
];

const supplierFaqs: SupplierFaq[] = [
  {
    question: "How do suppliers upgrade their tier?",
    answer: "Suppliers can upgrade inside their portal at any time. When they do, your wholesaler invoice automatically reflects the 15% sponsorship credit.",
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

export default function PricingPage() {
  return (
    <div className="safe-nav-offset pb-16">
      <section className="layout-shell">
        <div className="rounded-[32px] border border-white/10 bg-slate-900 px-8 py-12 text-white shadow-[0_25px_70px_rgba(15,23,42,0.4)]">
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-white/70">
            <Sparkles className="h-4 w-4" aria-hidden />
            No seats - No setup fees - Usage scales with value
          </div>
          <div className="mt-6 max-w-3xl space-y-4">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">Pricing that keeps your team moving.</h1>
            <p className="text-lg text-white/80">
              Flat wholesaler plans stay simple while usage entitlements scale on supplier connections, refresh speed, automations, and messaging volume.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="mailto:hello@joinleora.com?subject=Leora%20pricing"
              className="flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg transition hover:bg-amber-300 focus-visible:outline-white/80"
            >
              Request a walkthrough
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="#wholesaler"
              className="rounded-full border border-white/40 px-6 py-3 text-base font-medium text-white transition hover:bg-white/10"
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
              <p>Suppliers choose their analytics tier, you see credits automatically applied.</p>
            </div>
          </div>
        </div>
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
        supplierDiscounts={supplierDiscounts}
        supplierFaqs={supplierFaqs}
      />
      <section className="layout-shell mt-16">
        <div className="surface-card p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Conversation starters</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900">Questions we keep testing with every wholesaler</h2>
          <p className="mt-2 text-gray-600">Use these prompts in upcoming calls to pressure-test the knobs before rollout.</p>
          <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm text-gray-700">
            {validationQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="layout-shell mt-12">
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Coming soon</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900">Roadmap you can point prospects to</h2>
          <ul className="mt-5 space-y-3 text-sm text-gray-700">
            <li>
              <strong>Upcoming Calendar (Q2).</strong> Activity grouping + quick invites based on the spec in <code>UPCOMING_CALENDAR_INTEGRATION.md</code>.
            </li>
            <li>
              <strong>Automation trigger expansion.</strong> More conditions (burn rate, win-back, compliance) building on the workflows defined in <code>docs/AUTOMATED_TRIGGERS_GUIDE.md</code>.
            </li>
            <li>
              <strong>OCR & compliance enhancements.</strong> State license verification, batch scanning, and AR capture extending the Phase 4 work documented in <code>docs/PHASE4_SCANNER_README.md</code>.
            </li>
          </ul>
        </div>
      </section>

    </div>
  );
}
