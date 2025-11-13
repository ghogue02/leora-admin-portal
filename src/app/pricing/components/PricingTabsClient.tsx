"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ChartLine,
  CheckCircle2,
  Minus,
  RefreshCcw,
  Link2,
  Sparkles,
  Clock4,
  Zap,
  Network,
} from "lucide-react";
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
  Tier,
  tierOrder,
} from "../types";
import { TierCTA } from "./TierCTA";

export type PricingTabsClientProps = {
  tabs: PricingTab[];
  simplifiedWholesalerPlans: SimplifiedPlan[];
  simplifiedSupplierPlans: SimplifiedSupplierPlan[];
  wholesalerPlans: Plan[];
  supplierTiers: SupplierTier[];
  pricingFeatures: PricingFeatureCategory[];
  implementationHighlights: Array<{ title: string; detail: string }>;
  flywheelCredits: Array<{ title: string; detail: string }>;
  guardrails: Array<{ title: string; detail: string }>;
  faqs: Array<{ question: string; answer: string }>;
  exampleScenarios: ExampleScenario[];
  supplierDiscounts: SupplierDiscount[];
  supplierFaqs: SupplierFaq[];
};

const differentiatorIcons = {
  refresh: RefreshCcw,
  link: Link2,
  sparkles: Sparkles,
  clock: Clock4,
  bolt: Zap,
  network: Network,
} as const;

export function PricingTabsClient(props: PricingTabsClientProps) {
  const {
    tabs,
    simplifiedWholesalerPlans,
    simplifiedSupplierPlans,
    wholesalerPlans,
    supplierTiers,
    pricingFeatures,
    implementationHighlights,
    flywheelCredits,
    guardrails,
    faqs,
    exampleScenarios,
    supplierDiscounts,
    supplierFaqs,
  } = props;

  const [activeTab, setActiveTab] = useState<PricingTab["id"]>("wholesaler");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "supplier") {
      setActiveTab("supplier");
    }
  }, []);

  const handleTabChange = (tabId: PricingTab["id"]) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tabId}`);
    }
  };

  return (
    <div className="layout-shell mt-12">
      <span id="wholesaler" className="-mt-24 block pt-24" aria-hidden="true" />
      <span id="supplier" className="-mt-24 block pt-24" aria-hidden="true" />
      <nav role="tablist" className="tab-navigation flex flex-wrap gap-1 border-b-2 border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={clsx(
              "tab flex flex-1 items-center gap-3 rounded-t-2xl px-6 py-4 text-sm font-semibold transition",
              activeTab === tab.id
                ? "border-b-4 border-indigo-500 bg-indigo-50 text-indigo-600"
                : "border-b-4 border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            {tab.icon === "building" ? <Building2 className="h-4 w-4" aria-hidden /> : <ChartLine className="h-4 w-4" aria-hidden />}
            <span>{tab.label}</span>
            <span className="hidden text-xs font-normal text-gray-400 sm:inline">{tab.description}</span>
          </button>
        ))}
      </nav>

      <div className="tab-content">
        {activeTab === "wholesaler" ? (
          <WholesalerTab
            simplifiedPlans={simplifiedWholesalerPlans}
            plans={wholesalerPlans}
            pricingFeatures={pricingFeatures}
            implementationHighlights={implementationHighlights}
            flywheelCredits={flywheelCredits}
            guardrails={guardrails}
            faqs={faqs}
            exampleScenarios={exampleScenarios}
          />
        ) : (
          <SupplierTab
            simplifiedPlans={simplifiedSupplierPlans}
            supplierTiers={supplierTiers}
            supplierDiscounts={supplierDiscounts}
            supplierFaqs={supplierFaqs}
          />
        )}
      </div>
    </div>
  );
}

function WholesalerTab({
  simplifiedPlans,
  plans,
  pricingFeatures,
  implementationHighlights,
  flywheelCredits,
  guardrails,
  faqs,
  exampleScenarios,
}: {
  simplifiedPlans: SimplifiedPlan[];
  plans: Plan[];
  pricingFeatures: PricingFeatureCategory[];
  implementationHighlights: Array<{ title: string; detail: string }>;
  flywheelCredits: Array<{ title: string; detail: string }>;
  guardrails: Array<{ title: string; detail: string }>;
  faqs: Array<{ question: string; answer: string }>;
  exampleScenarios: ExampleScenario[];
}) {
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);

  return (
    <div>
      <section className="mt-10">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Wholesaler plans</p>
          <h2 className="text-3xl font-semibold text-gray-900">Choose your wholesaler plan</h2>
          <p className="text-base text-gray-600">Pick the tier that matches your team size, refresh cadence, and automation needs.</p>
        </header>
        <div className="cards-container mt-10 grid gap-6 md:grid-cols-3">
          {simplifiedPlans.map((plan) => (
            <div
              key={plan.id}
              className={clsx(
                "plan-card relative flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg",
                plan.id === "gold" && "border-2 border-indigo-400 bg-gradient-to-br from-indigo-50 via-white to-white shadow-xl"
              )}
            >
              {plan.badge ? (
                <span
                  className="badge absolute -top-3 right-4 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
                  style={{ backgroundColor: plan.badgeColor ?? "#111827" }}
                >
                  {plan.badge}
                </span>
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">{plan.tagline}</p>
              <h3 className="plan-name mt-2 text-2xl font-semibold text-gray-900">{plan.name}</h3>
              {plan.launchPrice ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-600">Launch pricing · first 12 months</p>
                  <p className="mt-1 text-3xl font-semibold">{plan.launchPrice}</p>
                  {plan.launchNote ? <p className="mt-1 text-xs text-emerald-700">{plan.launchNote}</p> : null}
                </div>
              ) : null}
              <div className="plan-price mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">Standard after launch</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-base font-semibold text-gray-400 line-through">
                    {plan.price}
                    {plan.priceInterval}
                  </span>
                  <span className="text-3xl font-semibold text-gray-900">{plan.discountedPrice ?? `${plan.price}${plan.priceInterval}`}</span>
                </div>
                {plan.discountNote ? (
                  <p className="mt-1 text-xs font-semibold text-emerald-600">{plan.discountNote}</p>
                ) : null}
              </div>
              <p className="description mt-3 text-sm font-medium text-gray-700">{plan.description}</p>
              <div className="best-for mt-4 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {plan.bestFor}
              </div>
              <ul className="key-differentiators mt-6 space-y-3 text-sm text-gray-700">
                {plan.keyDifferentiators.map((diff) => {
                  const Icon = differentiatorIcons[diff.icon];
                  return (
                    <li key={diff.label} className="flex gap-3 rounded-2xl border border-gray-100 bg-white/80 px-3 py-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900">{diff.label}</p>
                        <p className="text-xs text-gray-500">{diff.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <TierCTA tierId={plan.id as "silver" | "gold" | "platinum"} variant="card" location={`card-${plan.id}`} />
              <Link href="#full-comparison" className="learn-more-link mt-4 text-sm font-semibold text-indigo-600 hover:underline">
                View full features →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section id="full-comparison" className="mt-16 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Compare all features</p>
            <h2 className="text-2xl font-semibold text-gray-900">See detailed usage entitlements for each plan</h2>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={showDifferencesOnly}
              onChange={(event) => setShowDifferencesOnly(event.target.checked)}
            />
            Show differences only
          </label>
        </div>
        <PricingComparisonGrid
          plans={plans}
          features={pricingFeatures}
          highlightDifferencesOnly={showDifferencesOnly}
        />
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        {exampleScenarios.map((scenario) => (
          <div key={scenario.title} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Example scenario</p>
            <h3 className="mt-2 text-2xl font-semibold text-gray-900">{scenario.title}</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              {scenario.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-2">
        <div className="surface-card h-full rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Launch & services</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900">Product-led implementation</h2>
          <p className="mt-2 text-gray-600">
            We ship the portal ready-to-run. The only service layer is a bounded concierge so larger wholesalers know we will stand up their workflows quickly.
          </p>
          <div className="mt-6 space-y-4">
            {implementationHighlights.map((item) => (
              <div key={item.title}>
                <p className="font-semibold text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="surface-card h-full rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Flywheel & guardrails</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900">Keep it light, fair, and predictable</h2>
          <div className="mt-6 space-y-5">
            {flywheelCredits.map((item) => (
              <div key={item.title}>
                <p className="font-semibold text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-600">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-4">
            {guardrails.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" aria-hidden />
                <div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-600">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-16 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Pricing FAQ</p>
        <h2 className="mt-2 text-2xl font-semibold text-gray-900">Answers to the questions we hear most</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              <p className="text-sm font-semibold text-gray-900">{faq.question}</p>
              <p className="mt-2 text-sm text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SupplierTab({
  simplifiedPlans,
  supplierTiers,
  supplierDiscounts,
  supplierFaqs,
}: {
  simplifiedPlans: SimplifiedSupplierPlan[];
  supplierTiers: SupplierTier[];
  supplierDiscounts: SupplierDiscount[];
  supplierFaqs: SupplierFaq[];
}) {
  return (
    <div>
      <section className="mt-10 space-y-6">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Supplier analytics</p>
          <h2 className="text-3xl font-semibold text-gray-900">Let suppliers pay for deeper data access</h2>
          <p className="text-base text-gray-600">
            Suppliers choose how fast and how deep they want the data. You still own the relationship and see 15% off your plan price every month you share data.
          </p>
        </header>
        <div className="cards-container grid gap-6 lg:grid-cols-3">
          {simplifiedPlans.map((plan) => (
            <div key={plan.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">{plan.latencyLabel}</p>
              <h3 className="mt-2 text-2xl font-semibold text-gray-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-gray-900">{plan.price}</span>
                <span className="text-sm text-gray-500">{plan.priceInterval}</span>
              </div>
              <div className="mt-2 text-sm font-medium text-gray-600">{plan.latency}</div>
              <p className="mt-3 text-sm text-gray-500">{plan.bestFor}</p>
              <ul className="mt-5 space-y-2 text-sm text-gray-700">
                {plan.keyFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 text-indigo-500" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {plan.upgrade ? (
                <p className="mt-4 text-sm font-semibold text-indigo-600">{plan.upgrade}</p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="rounded-3xl border border-dashed border-gray-300 bg-indigo-50/60 px-6 py-4 text-sm text-gray-700">
          <strong className="font-semibold text-gray-900">How it works:</strong> Suppliers can start in Viewer (7-day delay) for 30 days, then upgrade
          anytime. When they share data back, we take 15% off your Leora plan price—suppliers still pay their own subscriptions.
        </div>

      </section>

      <section className="mt-16">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Supplier plan comparison</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900">Compare Viewer, Insights, and Actions</h2>
            </div>
            <Link
              href="mailto:suppliers@joinleora.com?subject=Supplier%20analytics"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Talk through supplier packaging
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-gray-700">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-500">
                  <th className="border-b border-gray-200 px-4 py-3 font-semibold">Tier</th>
                  <th className="border-b border-gray-200 px-4 py-3 font-semibold">Price</th>
                  <th className="border-b border-gray-200 px-4 py-3 font-semibold">Latency / depth</th>
                  <th className="border-b border-gray-200 px-4 py-3 font-semibold">What&apos;s included</th>
                  <th className="border-b border-gray-200 px-4 py-3 font-semibold">Best for</th>
                </tr>
              </thead>
              <tbody>
                {supplierTiers.map((tier) => (
                  <tr key={tier.name} className="align-top">
                    <td className="border-b border-gray-100 px-4 py-4 text-base font-semibold text-gray-900">{tier.name}</td>
                    <td className="border-b border-gray-100 px-4 py-4 text-base font-medium">{tier.price}</td>
                    <td className="border-b border-gray-100 px-4 py-4">{tier.latency}</td>
                    <td className="border-b border-gray-100 px-4 py-4">
                      <ul className="space-y-2">
                        {tier.includes.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-gray-600">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" aria-hidden />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="border-b border-gray-100 px-4 py-4 text-gray-600">{tier.bestFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Volume discounts</p>
          <div className="mt-4 space-y-3">
            {supplierDiscounts.map((discount) => (
              <div key={discount.range} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                <span className="font-medium text-gray-900">{discount.range}</span>
                <span className="text-gray-600">{discount.discount}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Supplier data credit</p>
          <h3 className="mt-2 text-xl font-semibold text-gray-900">15% off your plan when data sharing is on</h3>
          <p className="mt-3 text-sm text-gray-600">
            Example: Gold plan is $650/mo. Turn on data sharing and we credit $97.50 every month, so your invoice shows about $552.50/mo. Suppliers still pay for Viewer/Insights/Actions separately.
          </p>
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Supplier FAQ</p>
        <div className="mt-4 space-y-4">
          {supplierFaqs.map((faq) => (
            <details key={faq.question} className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-sm text-gray-700">
              <summary className="cursor-pointer font-semibold text-gray-900">{faq.question}</summary>
              <p className="mt-2 text-sm text-gray-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm text-center">
        <h3 className="text-2xl font-semibold text-gray-900">Ready to connect your suppliers?</h3>
        <p className="mt-2 text-sm text-gray-600">We will walk the supplier team through Viewer, Insights, or Actions and help them pick the right tier.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="mailto:suppliers@joinleora.com?subject=Supplier%20analytics"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:bg-indigo-400"
          >
            Talk through supplier packaging
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
          <a href="mailto:suppliers@joinleora.com" className="text-sm font-semibold text-indigo-600">
            suppliers@joinleora.com
          </a>
        </div>
      </section>
    </div>
  );
}

function PricingComparisonGrid({
  plans,
  features,
  highlightDifferencesOnly,
}: {
  plans: Plan[];
  features: PricingFeatureCategory[];
  highlightDifferencesOnly?: boolean;
}) {
  const planLookup = useMemo(() => new Map(plans.map((plan) => [plan.name, plan] as const)), [plans]);
  const filteredFeatures = useMemo(() => {
    if (!highlightDifferencesOnly) return features;
    return features
      .map((category) => ({
        ...category,
        features: category.features.filter((feature) => !isUniformFeature(feature)),
      }))
      .filter((category) => category.features.length > 0);
  }, [features, highlightDifferencesOnly]);

  const gridColumns = "grid grid-cols-[minmax(220px,2fr)_repeat(3,minmax(160px,1fr))]";

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div role="table" aria-label="Wholesaler plan comparison" className="min-w-[720px] text-sm text-gray-700">
        <div role="row" className={clsx(gridColumns, "sticky top-0 z-10 bg-white/95 shadow-sm")}>
          <div role="columnheader" className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
            Feature
          </div>
          {tierOrder.map((tier) => (
            <TierHeaderCell key={tier} tier={tier} plan={planLookup.get(tier)} />
          ))}
        </div>
        {filteredFeatures.map((category) => (
          <div key={category.category} role="rowgroup">
            <div role="row" className={clsx(gridColumns, "bg-gray-50 text-xs font-semibold uppercase tracking-[0.3em] text-gray-500")}>
              <div role="cell" className="col-span-4 px-4 py-3">{category.category}</div>
            </div>
            {category.features.map((feature) => (
              <div key={feature.name} role="row" className={clsx(gridColumns, "border-b border-gray-100 bg-white hover:bg-gray-50/70")}>
                <div role="rowheader" className="px-4 py-3 text-sm font-medium text-gray-900">
                  {feature.name}
                </div>
                {tierOrder.map((tier) => (
                  <ValueCell
                    key={`${feature.name}-${tier}`}
                    tier={tier}
                    value={feature[tier]}
                    type={feature.type}
                    highlight={Boolean(planLookup.get(tier)?.recommended)}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TierHeaderCell({ tier, plan }: { tier: Tier; plan: Plan | undefined }) {
  if (!plan) {
    return (
      <div role="columnheader" className="border-l border-gray-100 px-4 py-4 text-center text-sm font-semibold text-gray-900">
        {tier}
      </div>
    );
  }

  return (
    <div
      role="columnheader"
      className={clsx(
        "flex flex-col items-center gap-2 border-l border-gray-100 px-4 py-4 text-center",
        plan.recommended ? "bg-amber-50/70" : "bg-white"
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{plan.name}</p>
        {plan.badge ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            {plan.badge}
          </span>
        ) : null}
        <span className="text-sm font-semibold text-gray-400 line-through">
          {plan.price}
          {plan.frequency}
        </span>
        <p className="text-xl font-semibold text-gray-900">{plan.discountedPrice ?? `${plan.price}${plan.frequency}`}</p>
        {plan.discountNote ? <p className="text-[11px] font-semibold text-emerald-600">{plan.discountNote}</p> : null}
      </div>
      <TierCTA
        tierId={plan.name.toLowerCase() as "silver" | "gold" | "platinum"}
        variant="grid"
        location={`grid-${plan.name.toLowerCase()}`}
      />
    </div>
  );
}

function ValueCell({
  value,
  type,
  tier,
  highlight,
}: {
  value: string | boolean;
  type: FeatureType;
  tier: Tier;
  highlight?: boolean;
}) {
  const baseClasses = "border-l border-gray-100 px-4 py-3 text-center";
  const activeClasses = highlight ? "bg-amber-50/60" : "bg-white";

  if (typeof value === "boolean") {
    return (
      <div role="cell" className={clsx(baseClasses, activeClasses)}>
        {value ? (
          <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" aria-label={`${tier} includes this feature`} />
        ) : (
          <Minus className="mx-auto h-4 w-4 text-gray-300" aria-label={`${tier} does not include this feature`} />
        )}
      </div>
    );
  }

  const valueStyles: Record<Exclude<FeatureType, "boolean">, string> = {
    pricing: "text-lg font-semibold text-gray-900",
    value: "text-sm text-gray-900",
    progressive: "text-sm text-gray-900",
    quantity: "text-base font-semibold text-gray-900",
  };
  const resolvedType = (type === "boolean" ? "value" : type) as Exclude<FeatureType, "boolean">;

  return (
    <div role="cell" className={clsx(baseClasses, activeClasses)}>
      <span className={valueStyles[resolvedType]}>{value}</span>
    </div>
  );
}

function isUniformFeature(feature: FeatureConfig) {
  const values = tierOrder.map((tier) => feature[tier]);
  return values.every((value) => value === values[0]);
}

export default PricingTabsClient;
