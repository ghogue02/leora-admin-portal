import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cost & Scale Outlook",
  description:
    "Plain-language walkthrough of Supabase realtime and storage costs so clients can see how pricing scales alongside growth.",
};

type ScenarioBreakdown = {
  id: string;
  title: string;
  headline: string;
  activity: string;
  peakConnections: string;
  monthlyMessages: string;
  takeaway: string;
  costTable: Array<{
    item: string;
    usage: string;
    included: string;
    overage: string;
    cost: string;
  }>;
};

const pricingBlocks = [
  {
    icon: "💾",
    title: "Storage & Backups",
    details: [
      "First 100 GB are included on the Pro plan.",
      "After that it is $0.021 per GB per month (about $1 for every 50 GB).",
    ],
  },
  {
    icon: "🌐",
    title: "Bandwidth",
    details: [
      "250 GB of outbound bandwidth included.",
      "Overages are $0.09 per GB. That is 9 cents for moving 1,000 MB of data.",
    ],
  },
  {
    icon: "⚡",
    title: "Realtime",
    details: [
      "Every data change that goes to a connected screen counts as a message.",
      "Pro includes ~2 million messages + 200-500 concurrent connections. Above that it is $2.50 per 1M messages and $10 per 1,000 connections.",
    ],
  },
  {
    icon: "🔌",
    title: "Edge Functions (optional)",
    details: [
      "Think of these as tiny APIs that only run when needed.",
      "2 million function calls are included. Extra calls cost $2 per million and there are no compute-time surprises like AWS Lambda.",
    ],
  },
];

const scenarioOverview = [
  {
    scale: "Small",
    people: "5-10 sales reps · 500 customers",
    ordersPerDay: "100",
    monthlyCost: "$25",
    comment: "Comfortably inside the plan.",
  },
  {
    scale: "Medium",
    people: "25 reps · 2,000 customers",
    ordersPerDay: "500",
    monthlyCost: "$25",
    comment: "Usage still inside the included limits.",
  },
  {
    scale: "Large",
    people: "50 reps · 5,000 customers",
    ordersPerDay: "1,000",
    monthlyCost: "$35",
    comment: "+$10 for extra storage/bandwidth.",
  },
  {
    scale: "Enterprise",
    people: "100 reps · 10k customers",
    ordersPerDay: "2,500",
    monthlyCost: "$81",
    comment: "First time we clip the message limit.",
  },
  {
    scale: "Very Large",
    people: "200 reps · 25k customers",
    ordersPerDay: "5,000",
    monthlyCost: "$167–190",
    comment: "Bandwidth becomes the biggest lever.",
  },
];

const scenarioDetails: ScenarioBreakdown[] = [
  {
    id: "small",
    title: "Scenario 1 · Small Team",
    headline: "10 sales reps, 5 warehouse staff, 500 customers",
    activity: "Roughly 20-25 people active per day, each watching orders and pick sheets.",
    peakConnections: "~20 people connected at once (laptops + tablets).",
    monthlyMessages: "≈39,000 realtime messages per month.",
    takeaway: "Everything lands inside the included Supabase Pro limits, so the bill stays at $25/mo.",
    costTable: [
      { item: "Storage", usage: "10 GB", included: "100 GB", overage: "0", cost: "$0" },
      { item: "Bandwidth", usage: "30 GB", included: "250 GB", overage: "0", cost: "$0" },
      { item: "Realtime connections", usage: "20 peak", included: "200-500", overage: "0", cost: "$0" },
      { item: "Realtime messages", usage: "39K", included: "2M", overage: "0", cost: "$0" },
      { item: "Edge functions", usage: "10K", included: "2M", overage: "0", cost: "$0" },
      { item: "Total", usage: "", included: "", overage: "", cost: "$25/mo" },
    ],
  },
  {
    id: "medium",
    title: "Scenario 2 · Medium Team",
    headline: "25 sales reps, 10 warehouse staff, 2,000 customers",
    activity: "Around 75 people rotate through the system each day.",
    peakConnections: "~50 concurrent connections during the busiest hour.",
    monthlyMessages: "≈237,000 messages per month.",
    takeaway: "Still coasting on the included allowances – the Pro subscription alone covers it.",
    costTable: [
      { item: "Storage", usage: "40 GB", included: "100 GB", overage: "0", cost: "$0" },
      { item: "Bandwidth", usage: "120 GB", included: "250 GB", overage: "0", cost: "$0" },
      { item: "Realtime connections", usage: "50 peak", included: "200-500", overage: "0", cost: "$0" },
      { item: "Realtime messages", usage: "237K", included: "2M", overage: "0", cost: "$0" },
      { item: "Edge functions", usage: "50K", included: "2M", overage: "0", cost: "$0" },
      { item: "Total", usage: "", included: "", overage: "", cost: "$25/mo" },
    ],
  },
  {
    id: "large",
    title: "Scenario 3 · Large Team",
    headline: "50 sales reps, 20 warehouse staff, 5,000 customers",
    activity: "Roughly 220 active users each day with heavier warehouse coordination.",
    peakConnections: "~100 concurrent connections.",
    monthlyMessages: "≈631,500 messages per month.",
    takeaway: "Storage and bandwidth finally push a small overage, bringing the bill to about $35/mo.",
    costTable: [
      { item: "Storage", usage: "150 GB", included: "100 GB", overage: "50 GB", cost: "$1.05" },
      { item: "Bandwidth", usage: "350 GB", included: "250 GB", overage: "100 GB", cost: "$9.00" },
      { item: "Realtime connections", usage: "100 peak", included: "200-500", overage: "0", cost: "$0" },
      { item: "Realtime messages", usage: "631K", included: "2M", overage: "0", cost: "$0" },
      { item: "Edge functions", usage: "200K", included: "2M", overage: "0", cost: "$0" },
      { item: "Total", usage: "", included: "", overage: "", cost: "$35.05/mo" },
    ],
  },
  {
    id: "enterprise",
    title: "Scenario 4 · Enterprise",
    headline: "100 sales reps, 40 warehouse staff, 10,000 customers",
    activity: "Roughly 640 active users per day and a very busy order board.",
    peakConnections: "~220 concurrent connections.",
    monthlyMessages: "≈2.65 million messages per month.",
    takeaway:
      "First time we brush up against the realtime message limit. The extra 650K messages add about $1.63, and bandwidth leads the bill to ~$81/mo.",
    costTable: [
      { item: "Storage", usage: "350 GB", included: "100 GB", overage: "250 GB", cost: "$5.25" },
      { item: "Bandwidth", usage: "800 GB", included: "250 GB", overage: "550 GB", cost: "$49.50" },
      { item: "Realtime connections", usage: "220 peak", included: "200-500", overage: "0", cost: "$0" },
      { item: "Realtime messages", usage: "2.65M", included: "2M", overage: "650K", cost: "$1.63" },
      { item: "Edge functions", usage: "800K", included: "2M", overage: "0", cost: "$0" },
      { item: "Total", usage: "", included: "", overage: "", cost: "$81.38/mo" },
    ],
  },
  {
    id: "very-large",
    title: "Scenario 5 · Very Large",
    headline: "200 sales reps, 80 warehouse staff, 25,000 customers",
    activity: "About 1,530 people could be active in a day with nonstop customer portal activity.",
    peakConnections: "~430 concurrent connections – still largely included on Pro.",
    monthlyMessages: "≈8.24 million messages per month.",
    takeaway:
      "Bandwidth dominates the bill. Even at 8M realtime messages the extra charge is only ~$15.60/mo, putting the whole environment around $170-190/mo.",
    costTable: [
      { item: "Storage", usage: "600 GB", included: "100 GB", overage: "500 GB", cost: "$10.50" },
      {
        item: "Bandwidth",
        usage: "1,800 GB",
        included: "250 GB",
        overage: "1,550 GB",
        cost: "$139.50",
      },
      {
        item: "Realtime connections",
        usage: "430 peak",
        included: "200-500",
        overage: "0-230",
        cost: "$0-23.00",
      },
      { item: "Realtime messages", usage: "8.24M", included: "2M", overage: "6.24M", cost: "$15.60" },
      { item: "Edge functions", usage: "2.5M", included: "2M", overage: "500K", cost: "$1.00" },
      { item: "Total", usage: "", included: "", overage: "", cost: "$166.60-189.60/mo" },
    ],
  },
];

const messageScale = [
  { scale: "Small", dailyOrders: "100", monthlyMessages: "39K", overageCost: "$0" },
  { scale: "Medium", dailyOrders: "500", monthlyMessages: "237K", overageCost: "$0" },
  { scale: "Large", dailyOrders: "1,000", monthlyMessages: "631K", overageCost: "$0" },
  { scale: "Enterprise", dailyOrders: "2,500", monthlyMessages: "2.65M", overageCost: "$1.63" },
  { scale: "Very Large", dailyOrders: "5,000", monthlyMessages: "8.24M", overageCost: "$15.60" },
];

const costPerCustomer = [
  { scale: "Small", customers: "500", monthlyCost: "$25", perCustomer: "$0.05" },
  { scale: "Medium", customers: "2,000", monthlyCost: "$25", perCustomer: "$0.0125" },
  { scale: "Large", customers: "5,000", monthlyCost: "$35", perCustomer: "$0.0070" },
  { scale: "Enterprise", customers: "10,000", monthlyCost: "$81", perCustomer: "$0.0081" },
  { scale: "Very Large", customers: "25,000", monthlyCost: "$167-190", perCustomer: "$0.0076" },
];

const optimizationPlaybook = [
  {
    title: "Realtime discipline",
    tips: [
      "Subscribe only to the orders or inventory a person is actively viewing.",
      "Batch noisy updates (like rapid status flips) into a single change every few seconds.",
      "Use per-order channels instead of a single firehose channel.",
      "Keep subscriptions scoped to the current page instead of thousands of records at once.",
    ],
    snippet: `useEffect(() => {
  if (!isTabVisible) {
    subscription.unsubscribe(); // pause idle tabs
  }
}, [isTabVisible]);`,
  },
  {
    title: "Bandwidth hygiene",
    tips: [
      "Compress large images before upload (saves 70-80% of transfer).",
      "Serve public files through Supabase's built-in CDN so they get cached.",
      "Lazy-load galleries and long tables so only on-screen items download.",
    ],
    snippet: `const compressed = await compressImage(file, {
  maxWidth: 1200,
  quality: 0.8,
});`,
  },
  {
    title: "Storage housekeeping",
    tips: [
      "Auto-delete imports or uploads that are older than your retention policy.",
      "Archive infrequently used PDFs to cheaper cold storage.",
      "Compress PDFs or CSVs before saving when possible.",
    ],
    snippet: `const RETENTION_DAYS = 90;
await deleteImportsOlderThan(RETENTION_DAYS);`,
  },
];

export default function CostPage() {
  return (
    <div className="bg-white text-gray-900">
      <div className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Temporary briefing</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What realtime actually costs</h1>
          <p className="text-lg text-gray-700">
            This is a plain-language briefing for non-technical stakeholders. It explains how Supabase pricing behaves
            as more sales reps, warehouse staff, and customers come online. The quick takeaway: realtime stays low-cost,
            while bandwidth and storage are the knobs that start to matter at larger scales.
          </p>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-medium">Key lesson:</p>
            <p>
              Even at 25,000 customers with nonstop updates the realtime portion costs ~$16/mo. The bulk of the bill
              is simply moving large files around, which we can actively optimize.
            </p>
          </div>
        </header>

        <section aria-labelledby="pricing-basics">
          <div className="mb-4 flex items-center gap-3">
            <h2 id="pricing-basics" className="text-2xl font-semibold">
              How the Supabase bill is built
            </h2>
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">Cheatsheet</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {pricingBlocks.map((block) => (
              <article key={block.title} className="rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="text-2xl">{block.icon}</div>
                <h3 className="mt-2 text-xl font-semibold">{block.title}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-700">
                  {block.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="scenario-overview">
          <div className="mb-4">
            <h2 id="scenario-overview" className="text-2xl font-semibold">
              Scale scenarios at a glance
            </h2>
            <p className="text-sm text-gray-600">
              These reflect realistic usage patterns pulled from your current workflows: sales reps online all day,
              warehouse teams chasing pick sheets, and customers checking order status.
            </p>
          </div>
          <div className="overflow-auto rounded-2xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Scale</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">People in play</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Orders / day</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Monthly cost</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">What to tell clients</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {scenarioOverview.map((scenario) => (
                  <tr key={scenario.scale}>
                    <td className="px-4 py-3 font-semibold">{scenario.scale}</td>
                    <td className="px-4 py-3 text-gray-700">{scenario.people}</td>
                    <td className="px-4 py-3 text-gray-700">{scenario.ordersPerDay}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{scenario.monthlyCost}</td>
                    <td className="px-4 py-3 text-gray-700">{scenario.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="deep-dive">
          <h2 id="deep-dive" className="text-2xl font-semibold">
            Deep dive per scenario
          </h2>
          <p className="text-sm text-gray-600">
            Each snapshot shows the mix of people online, how many realtime &quot;pings&quot; that creates, and how
            that flows through the Supabase invoice.
          </p>
          <div className="mt-6 space-y-8">
            {scenarioDetails.map((scenario) => (
              <article
                key={scenario.id}
                className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">{scenario.title}</h3>
                    <p className="text-sm text-gray-600">{scenario.headline}</p>
                  </div>
                  <span className="rounded-full bg-gray-900 px-4 py-1 text-xs font-medium uppercase tracking-wide text-white">
                    {scenario.monthlyMessages}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <dt className="font-medium text-gray-900">Daily activity</dt>
                    <dd>{scenario.activity}</dd>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <dt className="font-medium text-gray-900">Peak connections</dt>
                    <dd>{scenario.peakConnections}</dd>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <dt className="font-medium text-gray-900">Realtime volume</dt>
                    <dd>{scenario.monthlyMessages}</dd>
                  </div>
                </dl>
                <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-800">
                  <p className="font-medium text-gray-900">Takeaway</p>
                  <p>{scenario.takeaway}</p>
                </div>
                <div className="mt-6 overflow-auto rounded-2xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Item</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Usage</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Included</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Overage</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {scenario.costTable.map((row) => (
                        <tr key={`${scenario.id}-${row.item}`}>
                          <td className="px-4 py-3 font-medium text-gray-900">{row.item}</td>
                          <td className="px-4 py-3 text-gray-700">{row.usage}</td>
                          <td className="px-4 py-3 text-gray-700">{row.included}</td>
                          <td className="px-4 py-3 text-gray-700">{row.overage}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{row.cost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="message-scale">
          <h2 id="message-scale" className="text-2xl font-semibold">
            Realtime usage scales gently
          </h2>
          <p className="text-sm text-gray-600">
            Message overages only appear once we pass ~2.5M monthly messages. Even 8M messages equals the cost of a
            single lunch.
          </p>
          <div className="mt-4 overflow-auto rounded-2xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Scale</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Daily orders</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Messages / month</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Realtime overage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {messageScale.map((row) => (
                  <tr key={row.scale}>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.scale}</td>
                    <td className="px-4 py-3 text-gray-700">{row.dailyOrders}</td>
                    <td className="px-4 py-3 text-gray-700">{row.monthlyMessages}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.overageCost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="cost-drivers">
          <h2 id="cost-drivers" className="text-2xl font-semibold">
            What actually drives the bill?
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-gray-200 p-4">
              <h3 className="text-lg font-semibold">Bandwidth is the heavyweight</h3>
              <p className="mt-2 text-sm text-gray-700">
                At 10,000 customers we spend ~$9/mo on bandwidth. At 25,000 it rises to ~$140/mo because large PDFs,
                product images, and pick sheet exports are flying around.
              </p>
            </article>
            <article className="rounded-2xl border border-gray-200 p-4">
              <h3 className="text-lg font-semibold">Storage grows slowly</h3>
              <p className="mt-2 text-sm text-gray-700">
                Growth is roughly 50 GB per year at medium scale, so we can plan for ~$1 per extra 50 GB.
              </p>
            </article>
            <article className="rounded-2xl border border-gray-200 p-4">
              <h3 className="text-lg font-semibold">Realtime is a rounding error</h3>
              <p className="mt-2 text-sm text-gray-700">
                Even at 8 million messages the fee is $15.60/mo. Connection counts stay included until we pass ~500
                simultaneous users.
              </p>
            </article>
          </div>
        </section>

        <section aria-labelledby="cost-per-customer">
          <h2 id="cost-per-customer" className="text-2xl font-semibold">
            Cost per customer keeps dropping
          </h2>
          <p className="text-sm text-gray-600">
            Because Supabase pricing is mostly fixed, every additional customer makes the platform cheaper on a per-user
            basis.
          </p>
          <div className="mt-4 overflow-auto rounded-2xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Scale</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Customers</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Monthly cost</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Cost / customer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {costPerCustomer.map((row) => (
                  <tr key={row.scale}>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.scale}</td>
                    <td className="px-4 py-3 text-gray-700">{row.customers}</td>
                    <td className="px-4 py-3 text-gray-700">{row.monthlyCost}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.perCustomer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="playbook">
          <h2 id="playbook" className="text-2xl font-semibold">
            Optimization playbook (use when needed)
          </h2>
          <p className="text-sm text-gray-600">
            These are easy wins if we ever need to dial the bill down. They also double as a lightweight education
            moment for clients.
          </p>
          <div className="mt-6 space-y-6">
            {optimizationPlaybook.map((play) => (
              <article key={play.title} className="rounded-3xl border border-gray-200 bg-gray-50 p-6 shadow-inner">
                <h3 className="text-lg font-semibold text-gray-900">{play.title}</h3>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {play.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
                <pre className="mt-4 overflow-x-auto rounded-xl bg-gray-900 p-4 text-xs text-gray-100">
                  <code>{play.snippet}</code>
                </pre>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="bottom-line" className="rounded-3xl border border-gray-200 bg-gray-900 p-6 text-white">
          <h2 id="bottom-line" className="text-2xl font-semibold">Bottom line for stakeholders</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <strong>Realtime ROI:</strong> Live updates remove refreshes, keep reps aligned, and cut customer support
              calls, all for single-digit dollars at our current scale.
            </li>
            <li>
              <strong>Bandwidth strategy:</strong> Compress and cache uploads to keep the fattest part of the bill tame
              as the customer portal explodes in popularity.
            </li>
            <li>
              <strong>Cost predictability:</strong> The Pro plan is $25/mo across Small + Medium. Once we crest 5,000
              customers we add roughly $10. Enterprise volume is still only ~$81.
            </li>
            <li>
              <strong>Client-ready soundbite:</strong> &quot;Even with tens of thousands of customers the tech stack runs
              us well under $200/mo, or less than one penny per customer.&quot;
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
