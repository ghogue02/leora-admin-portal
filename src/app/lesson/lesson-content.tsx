'use client';

import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';

type IntegrationType = 'external' | 'ai' | 'infrastructure' | 'internal';
type IntegrationStatus = 'active' | 'configured' | 'optional' | 'planned';

type Integration = {
  name: string;
  description: string;
  status: IntegrationStatus;
  type: IntegrationType;
  owner: string;
  routes: string[];
};

type DependencyImportance = 'critical' | 'supporting';
type DependencyFlow = 'read' | 'write' | 'bidirectional';

type Dependency = {
  targetId: string;
  reason: string;
  sampleRoutes: string[];
  importance: DependencyImportance;
  dataFlow: DependencyFlow;
};

type Incident = {
  date: string;
  summary: string;
  impact: string;
  mitigated: boolean;
};

type HistoryEvent = {
  date: string;
  event: string;
};

type StoryCard = {
  title: string;
  what: string;
  why: string;
  vendorAssist?: string;
};

type UseCase = {
  title: string;
  question: string;
  answer: string;
  affectedDependencies: string[];
};

type RouteNode = {
  id: string;
  label: string;
  routes: number;
  requestsPerDay: number;
  jobsPerDay: number;
  owner: string;
  summary: string;
  runbookUrl: string;
  dependencies: Dependency[];
  keyIntegrations: string[];
  sampleRoutes: string[];
  impactTags: Array<'Customer-facing' | 'Finance-critical' | 'Ops' | 'Internal'>;
  stories: StoryCard[];
  useCases: UseCase[];
  lastIncident?: Incident;
  history: HistoryEvent[];
};

type ConnectionTarget = {
  id: string;
  label: string;
  count: number;
  touchpoints: number;
  owner: string;
  summary: string;
  runbookUrl?: string;
  history: HistoryEvent[];
};

type Scenario = {
  id: string;
  title: string;
  description: string;
  highlightNodes: string[];
  highlightIntegrations: string[];
  playbook: string[];
};

type GlossaryItem = {
  term: string;
  definition: string;
};

type SelectedItem =
  | { kind: 'route'; node: RouteNode }
  | { kind: 'target'; target: ConnectionTarget }
  | { kind: 'integration'; integration: Integration };

const stats = [
  { label: 'Total API Routes', value: '380', detail: 'Internal + partner endpoints' },
  { label: 'External Services', value: '9', detail: 'Actively wired vendors' },
  { label: 'AI Integrations', value: '2', detail: 'Anthropic + OpenAI' },
  { label: 'API Domains', value: '6', detail: 'Sales, Ops, Finance, AI, Auth, Infra' },
] as const;

const filters: { label: string; value: IntegrationType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'External', value: 'external' },
  { label: 'AI', value: 'ai' },
  { label: 'Infrastructure', value: 'infrastructure' },
];

const integrations: Integration[] = [
  {
    name: 'Anthropic Claude',
    description: 'Copilot answers, enrichment, document OCR, and recommendations.',
    status: 'active',
    type: 'ai',
    owner: 'AI Platform',
    routes: ['/api/admin/customers', '/api/devops/incidents', '/api/sales/dashboard'],
  },
  {
    name: 'Mailchimp',
    description: 'Campaign creation, segmentation, and deliverability monitoring.',
    status: 'active',
    type: 'external',
    owner: 'Marketing Ops',
    routes: ['/api/admin/customers', '/api/admin/customers/places/search'],
  },
  {
    name: 'Twilio',
    description: 'Two-way SMS for order notifications and conversational outreach.',
    status: 'active',
    type: 'external',
    owner: 'Sales Engineering',
    routes: ['/api/sales/customers/:id', '/api/sales/customers/:id/places'],
  },
  {
    name: 'Google Maps & Places',
    description: 'Places autocomplete, routing hints, and place metadata enrichment.',
    status: 'active',
    type: 'external',
    owner: 'Platform Services',
    routes: ['/api/admin/customers/places/search', '/api/sales/customers/places/search'],
  },
  {
    name: 'Mapbox',
    description: 'Territory visualization and geo heatmaps for planners.',
    status: 'active',
    type: 'external',
    owner: 'Platform Services',
    routes: ['/api/sales/dashboard', '/api/sales/customers/:id'],
  },
  {
    name: 'Google Calendar',
    description: 'Calendar sync for call-plan scheduling and field rep scheduling.',
    status: 'active',
    type: 'external',
    owner: 'Sales Engineering',
    routes: ['/api/sales/customers/:id', '/api/devops/health-ping'],
  },
  {
    name: 'Microsoft Outlook',
    description: 'Microsoft Graph integration for executive and finance stakeholders.',
    status: 'active',
    type: 'external',
    owner: 'Sales Engineering',
    routes: ['/api/admin/customers', '/api/admin/customers/places/search'],
  },
  {
    name: 'Supabase',
    description: 'Primary Postgres + storage platform for migrations and async jobs.',
    status: 'active',
    type: 'infrastructure',
    owner: 'Platform Services',
    routes: ['/api/health', '/api/devops/health-ping', '/dev'],
  },
  {
    name: 'SendGrid / Resend',
    description: 'Transactional email for notifications with failover provider.',
    status: 'active',
    type: 'external',
    owner: 'Platform Services',
    routes: ['/api/admin/customers', '/api/sales/customers/:id'],
  },
  {
    name: 'Stripe',
    description: 'Payment capture, invoicing experiments, and subscription billing.',
    status: 'configured',
    type: 'external',
    owner: 'Finance Tech',
    routes: ['/api/admin/customers/:id', '/api/devops/health-ping'],
  },
  {
    name: 'OpenAI',
    description: 'Alternate AI provider for enrichment and safety fallbacks.',
    status: 'optional',
    type: 'ai',
    owner: 'AI Platform',
    routes: ['/api/admin/customers', '/api/devops/incidents'],
  },
  {
    name: 'Sage 50',
    description: 'Accounting system export for GL integration and reconciliations.',
    status: 'active',
    type: 'infrastructure',
    owner: 'Finance Tech',
    routes: ['/api/admin/customers/:id', '/api/devops/health-ping'],
  },
];

const routeNodes: RouteNode[] = [
  {
    id: 'core',
    label: 'Core Platform',
    routes: 180,
    requestsPerDay: 48000,
    jobsPerDay: 620,
    owner: 'Platform Services',
    summary: 'Next.js + Supabase orchestration for routing, jobs, auth, analytics, and automation.',
    runbookUrl:
      'https://github.com/ghogue02/leora-admin-portal/blob/main/docs/oauth/PRODUCTION_DEPLOYMENT.md',
    dependencies: [
      {
        targetId: 'sales',
        reason: 'Shares session state, tenant context, and reporting pipelines.',
        sampleRoutes: ['/api/sales/dashboard', '/api/sales/customers/:id'],
        importance: 'critical',
        dataFlow: 'bidirectional',
      },
      {
        targetId: 'infra',
        reason: 'Relies on Infra Jobs for scheduled automation and alerting.',
        sampleRoutes: ['/api/devops/health-ping', '/api/devops/incidents/ack'],
        importance: 'critical',
        dataFlow: 'write',
      },
      {
        targetId: 'external',
        reason: 'Brokers calls to Twilio, Mailchimp, and SendGrid on behalf of domain teams.',
        sampleRoutes: ['/api/admin/customers', '/api/sales/customers/:id/places'],
        importance: 'supporting',
        dataFlow: 'write',
      },
    ],
    keyIntegrations: ['Anthropic Claude', 'Mailchimp', 'Twilio', 'Google Maps & Places'],
    sampleRoutes: [
      'GET /api/admin/customers',
      'POST /api/devops/incidents/ack',
      'GET /api/health',
    ],
    impactTags: ['Customer-facing', 'Ops'],
    stories: [
      {
        title: 'Sales manager opens dashboard',
        what: 'Core validates the session, hydrates tenant context, and serves aggregated metrics.',
        why: 'Ensures every manager sees the correct customers and quotas without handoffs to IT.',
        vendorAssist: 'None – handled fully in-platform.',
      },
      {
        title: 'Incident acknowledgement from /dev',
        what: 'Pushes updates into JobRunLog and health tables, notifies Slack webhooks if needed.',
        why: 'Keeps production ops accountable and auditable.',
      },
    ],
    useCases: [
      {
        title: 'How do we roll up customer activity?',
        question: 'Which service turns raw tasks into the dashboard KPIs Travis sees?',
        answer:
          'Core ingests events from Sales Ops, aggregates them nightly, and exposes the roll-up through `/api/sales/dashboard`.',
        affectedDependencies: ['sales', 'infra'],
      },
      {
        title: 'Where do incident acknowledgements live?',
        question: 'If an alert fires, who records the acknowledgement?',
        answer:
          'Ops acknowledges through `/dev`, which writes to Core → Infra Jobs so alerts do not re-fire.',
        affectedDependencies: ['infra'],
      },
    ],
    lastIncident: {
      date: '2025-11-04',
      summary: 'Background job backlog after Supabase restart.',
      impact: 'Delayed dashboards and sampling metrics for 27 minutes.',
      mitigated: true,
    },
    history: [
      { date: '2025-08-12', event: 'Adopted pg_cron for health pings.' },
      { date: '2025-10-02', event: 'Added impersonation tooling for managers.' },
      { date: '2025-11-04', event: 'Implemented smoke tests + /dev console.' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales Ops',
    routes: 92,
    requestsPerDay: 15500,
    jobsPerDay: 120,
    owner: 'Sales Engineering',
    summary: 'Call plans, dashboards, sampling, and manager tooling for the field team.',
    runbookUrl: 'https://github.com/ghogue02/leora-admin-portal/blob/main/docs/SALES_RUNBOOK.md',
    dependencies: [
      {
        targetId: 'core',
        reason: 'Receives auth context, product data, and analytics from Core.',
        sampleRoutes: ['/api/sales/dashboard', '/api/sales/customers/:id'],
        importance: 'critical',
        dataFlow: 'read',
      },
      {
        targetId: 'external',
        reason: 'Uses Maps, Twilio, and calendar connectors for territory work.',
        sampleRoutes: [
          '/api/sales/customers/places/search',
          '/api/sales/customers/:id/places',
        ],
        importance: 'critical',
        dataFlow: 'bidirectional',
      },
      {
        targetId: 'ai',
        reason: 'Sends customer context to Copilot for opportunity summaries.',
        sampleRoutes: ['/api/sales/dashboard', '/api/sales/customers/:id'],
        importance: 'supporting',
        dataFlow: 'read',
      },
    ],
    keyIntegrations: ['Twilio', 'Google Maps & Places', 'Anthropic Claude'],
    sampleRoutes: [
      'GET /api/sales/dashboard',
      'GET /api/sales/customers/:id',
      'POST /api/sales/customers/:id/places',
    ],
    impactTags: ['Customer-facing'],
    stories: [
      {
        title: 'Rep plans Tuesday visits',
        what: 'Sales dashboard fetches territory accounts, sends addresses to Maps for drive-time hints.',
        why: 'Saves reps ~30 minutes/day of manual routing.',
        vendorAssist: 'Google Maps & Places',
      },
      {
        title: 'Text reminder goes out',
        what: 'Twilio sends reminder SMS when a sampling appointment is updated.',
        why: 'Cuts no-shows and shows Travis how automations support reps.',
      },
    ],
    useCases: [
      {
        title: '“What is powering the purple customer cards?”',
        question: 'Travis wants to know how the “needs attention” cards are computed.',
        answer:
          'Sales Ops hits `/api/sales/dashboard`, which pulls health metrics from Core and overlays field activities + AI scores.',
        affectedDependencies: ['core', 'ai'],
      },
      {
        title: '“Why do we need Google Maps?”',
        question: 'Explain why the map integration matters to a non engineer.',
        answer:
          'Reps type partial addresses inside Sales Ops. We call Google Places to autocomplete + validate geos before tasks sync to Twilio.',
        affectedDependencies: ['external'],
      },
    ],
    lastIncident: {
      date: '2025-11-01',
      summary: 'Maps autocomplete quota limit reached.',
      impact: 'Reps could not update visit plans for 42 minutes.',
      mitigated: true,
    },
    history: [
      { date: '2025-09-18', event: 'Sampling workflow overhaul (phase 2).' },
      { date: '2025-10-30', event: 'Customer health metrics added to dashboard.' },
    ],
  },
  {
    id: 'ops',
    label: 'Operations',
    routes: 74,
    requestsPerDay: 9200,
    jobsPerDay: 240,
    owner: 'Platform Services',
    summary: 'Warehouse intake, supplier sync, and logistics pipelines.',
    runbookUrl: 'https://github.com/ghogue02/leora-admin-portal/blob/main/docs/OPERATIONS_RUNBOOK.md',
    dependencies: [
      {
        targetId: 'core',
        reason: 'Relies on tenant context and job scheduler for imports.',
        sampleRoutes: ['/api/admin/customers/:id', '/api/admin/customers/places/details'],
        importance: 'critical',
        dataFlow: 'bidirectional',
      },
      {
        targetId: 'infrastructure',
        reason: 'Writes exports to Supabase storage, S3, and Sage.',
        sampleRoutes: ['/api/devops/health-ping', '/api/health'],
        importance: 'critical',
        dataFlow: 'write',
      },
    ],
    keyIntegrations: ['Supabase', 'Sage 50', 'SendGrid / Resend'],
    sampleRoutes: [
      'GET /api/admin/customers/:id',
      'POST /api/admin/customers/places/search',
      'POST /api/devops/health-ping',
    ],
    impactTags: ['Ops', 'Internal'],
    stories: [
      {
        title: 'Supplier invoice hits the pipeline',
        what: 'Ops ingests PDF, writes mismatched SKUs to Supabase, and notifies finance.',
        why: 'Prevents Travis from chasing missing vendor credits manually.',
      },
    ],
    useCases: [
      {
        title: '“Who feeds Sage with inventory changes?”',
        question: 'Ops leaders want to confirm data origin.',
        answer:
          'Operations exports nightly via `/api/devops/health-ping` job, writing to Supabase before Sage pulls it down.',
        affectedDependencies: ['infrastructure'],
      },
    ],
    history: [
      { date: '2025-07-30', event: 'Supplier invoice ingestion launched.' },
      { date: '2025-10-11', event: 'Added health ping acknowledgements.' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    routes: 38,
    requestsPerDay: 3100,
    jobsPerDay: 80,
    owner: 'Finance Tech',
    summary: 'Invoice batching, approvals, Sage exports, and payment monitoring.',
    runbookUrl: 'https://github.com/ghogue02/leora-admin-portal/blob/main/docs/FINANCE_RUNBOOK.md',
    dependencies: [
      {
        targetId: 'core',
        reason: 'Needs authoritative customer + order data.',
        sampleRoutes: ['/api/admin/customers/:id', '/api/admin/customers/places/details'],
        importance: 'critical',
        dataFlow: 'read',
      },
      {
        targetId: 'infrastructure',
        reason: 'Pushes invoices to Sage 50 and pulls Stripe payment state.',
        sampleRoutes: ['/api/devops/health-ping', '/api/admin/customers/:id'],
        importance: 'critical',
        dataFlow: 'bidirectional',
      },
    ],
    keyIntegrations: ['Stripe', 'Sage 50'],
    sampleRoutes: ['POST /api/devops/health-ping', 'GET /api/admin/customers/:id'],
    impactTags: ['Finance-critical'],
    stories: [
      {
        title: 'Export to Sage each night',
        what: 'Finance domain batches invoices, stores to Supabase storage, Sage fetches via SFTP.',
        why: 'Bookkeeping continues without manual CSV work.',
      },
    ],
    useCases: [
      {
        title: '“How does Stripe talk to Sage?”',
        question: 'Non-technical CFO wants assurance the loop closes.',
        answer:
          'Finance domain syncs Stripe statuses, then the Sage export job reconciles amounts before GL posting.',
        affectedDependencies: ['infrastructure'],
      },
    ],
    history: [
      { date: '2025-09-01', event: 'Sage export job automated.' },
      { date: '2025-10-15', event: 'Stripe subscription pilot enabled.' },
    ],
  },
  {
    id: 'ai',
    label: 'AI + Copilot',
    routes: 16,
    requestsPerDay: 2800,
    jobsPerDay: 42,
    owner: 'AI Platform',
    summary: 'Document OCR, enrichment, recommendations, and natural-language tooling.',
    runbookUrl: 'https://github.com/ghogue02/leora-admin-portal/blob/main/docs/AI_RECOMMENDATIONS_GUIDE.md',
    dependencies: [
      {
        targetId: 'core',
        reason: 'Pulls unified customer context for prompts.',
        sampleRoutes: ['/api/admin/customers', '/api/sales/dashboard'],
        importance: 'supporting',
        dataFlow: 'read',
      },
      {
        targetId: 'ai-vendors',
        reason: 'Anthropic + OpenAI endpoints for inference.',
        sampleRoutes: ['/api/admin/customers', '/api/devops/incidents'],
        importance: 'critical',
        dataFlow: 'bidirectional',
      },
    ],
    keyIntegrations: ['Anthropic Claude', 'OpenAI'],
    sampleRoutes: ['POST /api/devops/incidents', 'POST /api/admin/customers'],
    impactTags: ['Customer-facing'],
    stories: [
      {
        title: 'Copilot drafts a recap',
        what: 'AI domain asks Anthropic for a summary using customer data from Core.',
        why: 'Gives reps high-quality notes in seconds.',
      },
    ],
    useCases: [
      {
        title: '“Why is Claude necessary if we store data ourselves?”',
        question: 'Explain value to leadership.',
        answer:
          'Claude turns structured data into narratives for reps; we do not store the narratives anywhere else.',
        affectedDependencies: ['ai-vendors'],
      },
    ],
    history: [
      { date: '2025-08-05', event: 'Launched Copilot summarization.' },
      { date: '2025-09-27', event: 'Added OCR for invoices + cards.' },
    ],
  },
  {
    id: 'auth',
    label: 'Identity',
    routes: 24,
    requestsPerDay: 8600,
    jobsPerDay: 0,
    owner: 'Platform Services',
    summary: 'Session validation, impersonation controls, and tenant hand-offs.',
    runbookUrl:
      'https://github.com/ghogue02/leora-admin-portal/blob/main/docs/SECURITY_OVERVIEW.md',
    dependencies: [
      {
        targetId: 'core',
        reason: 'Persists sessions + token signatures in Core Platform.',
        sampleRoutes: ['/api/middleware', '/dev'],
        importance: 'critical',
        dataFlow: 'bidirectional',
      },
    ],
    keyIntegrations: ['Supabase Auth'],
    sampleRoutes: ['middleware.ts', 'GET /dev'],
    impactTags: ['Internal'],
    stories: [
      {
        title: 'Manager impersonates a rep',
        what: 'Identity issues scoped token to Core + Sales Ops.',
        why: 'Lets managers mentor without sharing passwords.',
      },
    ],
    useCases: [
      {
        title: '“Who controls access to /dev?”',
        question: 'Non-technical owner wants reassurance.',
        answer: 'Identity enforces admin role; without it, /dev redirects to sales login.',
        affectedDependencies: ['core'],
      },
    ],
    history: [
      { date: '2025-07-15', event: 'Tenant switcher for admins released.' },
      { date: '2025-10-09', event: 'Impersonation flow upgraded for managers.' },
    ],
  },
  {
    id: 'infra',
    label: 'Infra Jobs',
    routes: 26,
    requestsPerDay: 1200,
    jobsPerDay: 640,
    owner: 'Platform Services',
    summary: 'Background jobs, cron tasks, observability webhooks, and Supabase automations.',
    runbookUrl: 'https://github.com/ghogue02/leora-admin-portal/blob/main/docs/JOBS_RUNBOOK.md',
    dependencies: [
      {
        targetId: 'core',
        reason: 'Schedules + logs job runs in JobRunLog.',
        sampleRoutes: ['/api/devops/health-ping', '/api/jobs/run'],
        importance: 'critical',
        dataFlow: 'bidirectional',
      },
      {
        targetId: 'infrastructure',
        reason: 'Replays and health checks executed via Supabase + Vercel cron.',
        sampleRoutes: ['/api/devops/health-ping'],
        importance: 'critical',
        dataFlow: 'write',
      },
    ],
    keyIntegrations: ['Supabase', 'Vercel Cron'],
    sampleRoutes: ['POST /api/devops/health-ping', 'npm run jobs:run -- smoke'],
    impactTags: ['Ops', 'Internal'],
    stories: [
      {
        title: 'Cron pings /api/health',
        what: 'Infra Jobs calls `/api/health` for each tenant and logs results.',
        why: 'Provides the uptime record Travis asks for in production meetings.',
      },
    ],
    useCases: [
      {
        title: '“What happens when /api/health fails?”',
        question: 'Need to explain to stakeholders.',
        answer:
          'Infra Jobs records failure → /dev shows red indicator → alerts post to Slack with runbook link.',
        affectedDependencies: ['core', 'infrastructure'],
      },
    ],
    history: [
      { date: '2025-08-01', event: 'Replay monitor established.' },
      { date: '2025-11-04', event: 'Smoke tests wired into CI.' },
    ],
  },
];

const connectionTargets: ConnectionTarget[] = [
  {
    id: 'external',
    label: 'External Services',
    count: 9,
    touchpoints: 47,
    owner: 'Platform Services',
    summary: 'Mailchimp, Twilio, calendar, Resend, Stripe, and other partner APIs.',
    runbookUrl: 'https://github.com/ghogue02/leora-admin-portal/blob/main/docs/INTEGRATIONS.md',
    history: [
      { date: '2025-09-05', event: 'Stripe pilot connected.' },
      { date: '2025-10-28', event: 'Twilio messaging service upgraded.' },
    ],
  },
  {
    id: 'ai-vendors',
    label: 'AI Vendors',
    count: 2,
    touchpoints: 14,
    owner: 'AI Platform',
    summary: 'Anthropic Claude + OpenAI fallback models powering Copilot experiences.',
    runbookUrl:
      'https://github.com/ghogue02/leora-admin-portal/blob/main/docs/AI_RECOMMENDATIONS_GUIDE.md',
    history: [
      { date: '2025-08-05', event: 'Claude 3.5 Sonnet adopted as default.' },
      { date: '2025-10-12', event: 'OpenAI failover validated weekly.' },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    count: 4,
    touchpoints: 33,
    owner: 'Platform Services',
    summary: 'Supabase Postgres + storage, Vercel cron, script runners, and Sage exports.',
    runbookUrl:
      'https://github.com/ghogue02/leora-admin-portal/blob/main/docs/INFRASTRUCTURE.md',
    history: [
      { date: '2025-09-22', event: 'pg_cron tasks deployed to Supabase.' },
      { date: '2025-11-03', event: 'CI smoke tests added for /api/health.' },
    ],
  },
];

const scenarios: Scenario[] = [
  {
    id: 'maps-outage',
    title: 'Maps outage',
    description:
      'Google Maps & Places quota exhausted. Explore the domains and vendors that lose functionality.',
    highlightNodes: ['sales'],
    highlightIntegrations: ['Google Maps & Places'],
    playbook: [
      'Switch Sales Ops to manual address entry (fallback toggle).',
      'Notify reps via Twilio template that routing suggestions are paused.',
      'Request quota uplift via Google Cloud console.',
    ],
  },
  {
    id: 'sage-delay',
    title: 'Sage export delayed',
    description:
      'Infrastructure write from Ops/Finance to Sage 50 is failing. Show chain of impact.',
    highlightNodes: ['ops', 'finance', 'infra'],
    highlightIntegrations: ['Sage 50'],
    playbook: [
      'Check `/dev` backlog widget for export job.',
      'Rerun job via Infra Jobs runner if data is ready.',
      'Alert Finance with manual CSV (link in runbook).',
    ],
  },
  {
    id: 'incident-mode',
    title: 'Incident mode',
    description:
      'Core Platform degraded; highlight everything that depends on it and the quick steps to mitigate.',
    highlightNodes: ['core', 'sales', 'ops', 'finance', 'auth', 'infra', 'ai'],
    highlightIntegrations: [],
    playbook: [
      'Confirm health summary in /dev.',
      'Post update to Slack #ops using template in runbook.',
      'Prioritize Infra Jobs backlog drains before re-enabling AI features.',
    ],
  },
];

const glossaryItems: GlossaryItem[] = [
  {
    term: 'JobRunLog',
    definition: 'Table that tracks every background job execution (tenant, status, duration).',
  },
  {
    term: 'pg_cron',
    definition: 'Supabase extension that schedules SQL functions (used for health pings).',
  },
  {
    term: 'Tenant context',
    definition: 'Bundle of ids/permissions we pass through middleware so multi-brand data stays isolated.',
  },
  {
    term: 'Copilot',
    definition: 'Anthropic-powered experience embedded in Sales Ops for summaries and recommendations.',
  },
];

const routeLookup = Object.fromEntries(routeNodes.map((node) => [node.id, node])) as Record<
  RouteNode['id'],
  RouteNode
>;

const targetLookup = Object.fromEntries(connectionTargets.map((target) => [target.id, target])) as Record<
  ConnectionTarget['id'],
  ConnectionTarget
>;

const statusLabel: Record<IntegrationStatus, string> = {
  active: 'Active',
  configured: 'Configured',
  optional: 'Optional',
  planned: 'Planned',
};

const statusTone: Record<IntegrationStatus, string> = {
  active: 'bg-slate-100 text-slate-700 border border-slate-200',
  configured: 'bg-slate-100 text-slate-700 border border-slate-200',
  optional: 'bg-slate-100 text-slate-600 border border-slate-200',
  planned: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const chipClass =
  'rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700';

const chipButtonClass =
  'rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-500';

const numberFormatter = Intl.NumberFormat('en-US');

export function LessonContent() {
  const [filter, setFilter] = useState<(typeof filters)[number]['value']>('all');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({
    kind: 'route',
    node: routeNodes[0],
  });
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [showTechnical, setShowTechnical] = useState(true);

  const filteredIntegrations = useMemo(() => {
    if (filter === 'all') return integrations;
    return integrations.filter((integration) => integration.type === filter);
  }, [filter]);

  const matchedIds = useMemo(() => {
    if (!search.trim()) return new Set<string>();
    const term = search.trim().toLowerCase();
    const matches = new Set<string>();

    routeNodes.forEach((node) => {
      const fields = [node.label, node.summary, node.owner, ...node.keyIntegrations, ...node.sampleRoutes];
      if (fields.some((field) => field.toLowerCase().includes(term))) {
        matches.add(node.id);
      }
    });

    connectionTargets.forEach((target) => {
      const fields = [target.label, target.summary, target.owner];
      if (fields.some((field) => field.toLowerCase().includes(term))) {
        matches.add(target.id);
      }
    });

    integrations.forEach((integration) => {
      if (integration.name.toLowerCase().includes(term)) {
        matches.add('integration:' + integration.name);
      }
    });

    return matches;
  }, [search]);

  const highlightNodes = new Set(selectedScenario?.highlightNodes ?? []);
  const highlightIntegrations = new Set(selectedScenario?.highlightIntegrations ?? []);

  const graph = useMemo(() => {
    const diameter = 620;
    const center = diameter / 2;
    const innerRadius = 150;
    const outerRadius = 260;
    const minRadius = 28;
    const maxRadius = 80;
    const maxRequests = Math.max(...routeNodes.map((node) => node.requestsPerDay));

    const positionedRoutes = routeNodes.map((node, index) => {
      if (node.id === 'core') {
        return { ...node, x: center, y: center, radius: maxRadius };
      }
      const angle = (index / (routeNodes.length - 1)) * Math.PI * 2;
      const radius = minRadius + ((node.requestsPerDay / maxRequests) * (maxRadius - minRadius));
      return {
        ...node,
        x: center + innerRadius * Math.cos(angle),
        y: center + innerRadius * Math.sin(angle),
        radius,
      };
    });

    const positionedTargets = connectionTargets.map((target, index) => {
      const angle = (index / connectionTargets.length) * Math.PI * 2;
      return {
        ...target,
        x: center + outerRadius * Math.cos(angle + Math.PI / 5),
        y: center + outerRadius * Math.sin(angle + Math.PI / 5),
        radius: 45,
      };
    });

    const lines = positionedRoutes.flatMap((node) =>
      node.dependencies.map((dependency) => {
        const target =
          positionedRoutes.find((candidate) => candidate.id === dependency.targetId) ??
          positionedTargets.find((candidate) => candidate.id === dependency.targetId);
        if (!target) return null;
        return {
          from: { x: node.x, y: node.y },
          to: { x: target.x, y: target.y },
          importance: dependency.importance,
          reason: dependency.reason,
          sourceId: node.id,
          targetId: dependency.targetId,
          midpoint: {
            x: (node.x + target.x) / 2,
            y: (node.y + target.y) / 2,
          },
        };
      })
    ).filter(Boolean) as Array<{
      from: { x: number; y: number };
      to: { x: number; y: number };
      importance: DependencyImportance;
      reason: string;
      sourceId: string;
      targetId: string;
      midpoint: { x: number; y: number };
    }>;

    return { diameter, nodes: positionedRoutes, targets: positionedTargets, lines };
  }, []);

  const handleSvgKey = (event: KeyboardEvent<SVGGElement>, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const formatRequests = (value: number) => `${numberFormatter.format(value)} req/day (~${Math.round(value / 24)} / hr)`;

  const renderIncident = (incident?: Incident) => {
    if (!incident) return null;
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-900">
        <p className="font-semibold">Last incident · {incident.date}</p>
        <p className="mt-1">{incident.summary}</p>
        <p className="mt-1 text-rose-700">{incident.impact}</p>
        <p className="mt-1 text-xs uppercase tracking-wide">{incident.mitigated ? 'Mitigated' : 'Ongoing'}</p>
      </div>
    );
  };

  const renderHistory = (history: HistoryEvent[]) => (
    <ol className="space-y-2 text-sm">
      {history.map((entry) => (
        <li key={`${entry.date}-${entry.event}`} className="flex gap-3">
          <div className="shrink-0 text-xs font-semibold text-slate-500">{entry.date}</div>
          <p className="text-slate-700">{entry.event}</p>
        </li>
      ))}
    </ol>
  );

  const renderDependencies = (dependencies: Dependency[]) => (
    <div className="space-y-3">
      {dependencies.map((dependency) => {
        const target =
          routeLookup[dependency.targetId] ??
          targetLookup[dependency.targetId as keyof typeof targetLookup];
        if (!target) return null;
        return (
          <article
            key={`${dependency.targetId}-${dependency.reason}`}
            className="rounded-xl border border-slate-200 bg-white/80 p-3 text-sm shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {dependency.importance === 'critical' ? 'Critical path' : 'Supporting'} · Flow {dependency.dataFlow}
            </p>
            <p className="text-base font-semibold text-slate-900">{target.label}</p>
            <p className="text-slate-600">{dependency.reason}</p>
            {showTechnical ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {dependency.sampleRoutes.slice(0, 2).map((route) => (
                  <span key={route} className={chipClass}>
                    {route}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );

  const renderStoryCards = (stories: StoryCard[]) => (
    <div className="grid gap-3 lg:grid-cols-2">
      {stories.map((story) => (
        <article
          key={story.title}
          className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{story.title}</p>
          <p className="mt-2 text-slate-900">{story.what}</p>
          <p className="mt-2 text-slate-600">{story.why}</p>
          {story.vendorAssist ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Vendor assist: {story.vendorAssist}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );

  const renderUseCases = (useCases: UseCase[]) => (
    <div className="space-y-3">
      {useCases.map((useCase) => (
        <article key={useCase.title} className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{useCase.title}</p>
          <p className="mt-1 text-slate-900">{useCase.question}</p>
          <p className="mt-2 text-slate-600">{useCase.answer}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {useCase.affectedDependencies.map((dependency) => (
              <span key={dependency} className={chipClass}>
                {dependency}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );

  const renderSelectionPanel = () => {
    if (selectedItem.kind === 'route') {
      const node = selectedItem.node;
      const ownedIntegrations = integrations.filter((integration) =>
        node.keyIntegrations.includes(integration.name)
      );

      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Domain</p>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-semibold text-slate-900">{node.label}</h3>
              {node.impactTags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-900/10 px-3 py-1 text-xs font-semibold text-slate-900">
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-sm text-slate-600">{node.summary}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile label="Routes" value={node.routes.toString()} />
            <MetricTile label="Requests per day" value={formatRequests(node.requestsPerDay)} />
            <MetricTile label="Jobs per day" value={`${numberFormatter.format(node.jobsPerDay)} jobs`} />
          </div>
          <div className="space-y-2">
            <SectionHeader label="Dependencies" description="Why this domain leans on others." />
            {renderDependencies(node.dependencies)}
          </div>
          {!showTechnical ? null : renderIncident(node.lastIncident)}
          <div className="space-y-2">
            <SectionHeader label="Story cards" description="Plain-language explanation of workflows." />
            {renderStoryCards(node.stories)}
          </div>
          <div className="space-y-2">
            <SectionHeader label="Common questions" description="How to answer stakeholder prompts." />
            {renderUseCases(node.useCases)}
          </div>
          <div className="space-y-2">
            <SectionHeader label="Key integrations" description="Tap to drill further." />
            <div className="flex flex-wrap gap-2">
              {ownedIntegrations.map((integration) => (
                <button
                  key={integration.name}
                  type="button"
                  className={chipButtonClass}
                  onClick={() => setSelectedItem({ kind: 'integration', integration })}
                >
                  {integration.name}
                </button>
              ))}
            </div>
          </div>
          {showTechnical ? (
            <div className="space-y-2">
              <SectionHeader label="Sample routes" description="" />
              <ul className="list-disc space-y-1 pl-4 text-sm text-slate-600">
                {node.sampleRoutes.map((route) => (
                  <li key={route}>{route}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="space-y-2">
            <SectionHeader label="Evolution" description="Major milestones." />
            {renderHistory(node.history)}
          </div>
          <a
            href={node.runbookUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-sm font-semibold text-slate-900 underline"
          >
            Open runbook
          </a>
        </div>
      );
    }

    if (selectedItem.kind === 'target') {
      const target = selectedItem.target;
      const inboundRoutes = routeNodes.filter((node) =>
        node.dependencies.some((dependency) => dependency.targetId === target.id)
      );

      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Vendor cluster</p>
            <h3 className="text-2xl font-semibold text-slate-900">{target.label}</h3>
            <p className="text-sm text-slate-600">{target.summary}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile label="Vendors" value={target.count.toString()} />
            <MetricTile label="Touchpoints" value={`${target.touchpoints} routes`} />
            <MetricTile label="Owner" value={target.owner} />
          </div>
          <div>
            <SectionHeader label="Used by" description="Domains depending on this cluster." />
            <div className="mt-2 flex flex-wrap gap-2">
              {inboundRoutes.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  className={chipButtonClass}
                  onClick={() => setSelectedItem({ kind: 'route', node: route })}
                >
                  {route.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <SectionHeader label="History" description="" />
            {renderHistory(target.history)}
          </div>
          {target.runbookUrl ? (
            <a
              href={target.runbookUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm font-semibold text-slate-900 underline"
            >
              Vendor runbook
            </a>
          ) : null}
        </div>
      );
    }

    const integration = selectedItem.integration;
    const touchingRoutes = routeNodes.filter((route) =>
      route.keyIntegrations.includes(integration.name)
    );

    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Integration</p>
          <h3 className="text-2xl font-semibold text-slate-900">{integration.name}</h3>
          <p className="text-sm text-slate-600">{integration.description}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile label="Owner" value={integration.owner} />
          <MetricTile label="Status" value={statusLabel[integration.status]} />
          <MetricTile label="Routes" value={integration.routes.length.toString()} />
        </div>
        <div>
          <SectionHeader label="Connected domains" description="" />
          <div className="mt-2 flex flex-wrap gap-2">
            {touchingRoutes.map((route) => (
              <button
                key={route.id}
                type="button"
                className={chipButtonClass}
                onClick={() => setSelectedItem({ kind: 'route', node: route })}
              >
                {route.label}
              </button>
            ))}
          </div>
        </div>
        {showTechnical ? (
          <div>
            <SectionHeader label="Sample routes" description="" />
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
              {integration.routes.map((route) => (
                <li key={route}>{route}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  };

  const renderScenarioStrip = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-slate-700">Scenario explorer</p>
        <div className="flex flex-wrap gap-2">
          {scenarios.map((scenario) => {
            const isActive = selectedScenario?.id === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setSelectedScenario((prev) => (prev?.id === scenario.id ? null : scenario))}
                className={[
                  'rounded-full border px-4 py-1.5 text-xs font-semibold transition',
                  isActive
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-400',
                ].join(' ')}
              >
                {scenario.title}
              </button>
            );
          })}
        </div>
      </div>
      {selectedScenario ? (
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-900">
          <p className="font-semibold">{selectedScenario.title}</p>
          <p className="mt-1 text-indigo-900/90">{selectedScenario.description}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-700">Playbook</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-indigo-900/90">
            {selectedScenario.playbook.map((step, index) => (
              <li key={`${selectedScenario.id}-step-${index}`}>{step}</li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">Pick a scenario to highlight impacted domains + vendors and see the mitigation steps.</p>
      )}
    </div>
  );

  const renderGlossary = () => (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Glossary</p>
          <h2 className="text-xl font-semibold text-slate-900">What does that acronym mean?</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowTechnical((prev) => !prev)}
          className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700"
        >
          {showTechnical ? 'Hide technical' : 'Show technical'}
        </button>
      </div>
      <dl className="mt-4 grid gap-4 md:grid-cols-2">
        {glossaryItems.map((item) => (
          <div key={item.term} className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <dt className="text-sm font-semibold text-slate-900">{item.term}</dt>
            <dd className="mt-1 text-sm text-slate-600">{item.definition}</dd>
          </div>
        ))}
      </dl>
    </section>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
        <section className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <header className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
                Field Lesson
              </p>
              <h1 className="text-3xl font-semibold text-slate-900">Leora API Architecture</h1>
              <p className="text-base text-slate-600">
                A compact walkthrough of how internal domains, shared services, and vendor systems link together to power sales workflows.
              </p>
            </header>

            <div className="grid gap-3 sm:grid-cols-2">
              {stats.map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {stat.label}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-600">Search connections</p>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="calendar, mapbox, invoices..."
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Filter integrations</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {filters.map((item) => {
                      const isActive = filter === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setFilter(item.value)}
                          className={[
                            'rounded-full border px-4 py-1.5 text-xs font-semibold transition',
                            isActive
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-400',
                          ].join(' ')}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            {renderScenarioStrip()}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              System map
            </p>
            <h2 className="text-xl font-semibold text-slate-900">Route Mind Map</h2>
            <p className="text-sm text-slate-600">
              Nodes are scaled by request volume. Click any node to reveal the “story” of that dependency, plus the why/what of every connection.
            </p>
          </div>
          <div
            className="mt-6 overflow-hidden rounded-[32px] border border-slate-100 bg-gradient-to-b from-slate-100/80 to-slate-200/40"
            style={{ minHeight: 560 }}
          >
            <svg
              viewBox={`0 0 ${graph.diameter} ${graph.diameter}`}
              role="img"
              aria-label="Mind map representing connections between Leora route domains and vendors"
            >
                <defs>
                  <radialGradient id="nodeFade" cx="50%" cy="50%" r="75%">
                    <stop offset="0%" stopColor="#fff" />
                    <stop offset="100%" stopColor="#e2e8f0" />
                  </radialGradient>
                  <marker
                    id="arrowhead"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                    fill="#94a3b8"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" />
                  </marker>
                </defs>
                <rect width="100%" height="100%" fill="url(#nodeFade)" />
                {graph.lines.map((line, index) => {
                  const isScenarioHighlight =
                    highlightNodes.has(line.sourceId) || highlightNodes.has(line.targetId);
                  const isSearchHighlight =
                    matchedIds.has(line.sourceId) || matchedIds.has(line.targetId) || matchedIds.size === 0;
                  const opacity =
                    isScenarioHighlight || matchedIds.size === 0
                      ? 0.95
                      : isSearchHighlight
                        ? 0.75
                        : 0.25;
                  return (
                    <g key={index}>
                      <line
                        x1={line.from.x}
                        y1={line.from.y}
                        x2={line.to.x}
                        y2={line.to.y}
                        stroke={line.importance === 'critical' ? '#0f172a' : '#cbd5f5'}
                        strokeWidth={line.importance === 'critical' ? 2.4 : 1.4}
                        strokeDasharray={line.importance === 'critical' ? undefined : '4 4'}
                        opacity={opacity}
                        markerEnd="url(#arrowhead)"
                      />
                      <text
                        x={line.midpoint.x}
                        y={line.midpoint.y}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#475569"
                        opacity={opacity}
                      >
                        {line.reason}
                      </text>
                    </g>
                  );
                })}
                {graph.targets.map((target) => {
                  const isActive =
                    selectedItem.kind === 'target' && selectedItem.target.id === target.id;
                  const isMatched = matchedIds.size === 0 || matchedIds.has(target.id);
                  const isScenario = highlightNodes.has(target.id);
                  const activate = () => setSelectedItem({ kind: 'target', target });
                  return (
                    <g
                      key={target.id}
                      tabIndex={0}
                      role="button"
                      className="cursor-pointer focus:outline-none"
                      aria-pressed={isActive}
                      onClick={activate}
                      onKeyDown={(event) => handleSvgKey(event, activate)}
                    >
                      <circle
                        cx={target.x}
                        cy={target.y}
                        r={target.radius}
                        fill={isScenario ? '#fde68a' : '#f8fafc'}
                        stroke={isActive ? '#0f172a' : '#cbd5f5'}
                        strokeWidth={isActive ? 3 : 2}
                        opacity={isMatched ? 1 : 0.3}
                      />
                      <text
                        x={target.x}
                        y={target.y - 4}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight={600}
                        fill="#0f172a"
                      >
                        {target.label}
                      </text>
                      <text
                        x={target.x}
                        y={target.y + 12}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#475569"
                      >
                        {target.count} vendors
                      </text>
                    </g>
                  );
                })}
                {graph.nodes.map((node) => {
                  const isActive =
                    selectedItem.kind === 'route' && selectedItem.node.id === node.id;
                  const isMatched = matchedIds.size === 0 || matchedIds.has(node.id);
                  const isScenario = highlightNodes.has(node.id);
                  const activate = () => setSelectedItem({ kind: 'route', node });
                  return (
                    <g
                      key={node.id}
                      tabIndex={0}
                      role="button"
                      className="cursor-pointer focus:outline-none"
                      aria-pressed={isActive}
                      onClick={activate}
                      onKeyDown={(event) => handleSvgKey(event, activate)}
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius}
                        fill={isScenario ? '#bfdbfe' : isActive ? '#f8fafc' : '#fff'}
                        stroke={isActive ? '#0f172a' : '#94a3b8'}
                        strokeWidth={isActive ? 3 : 2}
                        opacity={isMatched ? 1 : 0.3}
                      />
                      <text
                        x={node.x}
                        y={node.y - 4}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight={600}
                        fill="#0f172a"
                      >
                        {node.label}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + 12}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#475569"
                      >
                        {numberFormatter.format(node.requestsPerDay)} req/day
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
              {renderSelectionPanel()}
            </div>
          </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">External integrations</p>
              <p className="text-xs text-slate-500">
                {filteredIntegrations.length} entries shown · filter:{' '}
                {filter === 'all' ? 'none' : filters.find((f) => f.value === filter)?.label}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Ownership reflects the on-call rotation or team that owns the integration.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filteredIntegrations.map((integration) => {
              const isSelected =
                selectedItem.kind === 'integration' &&
                selectedItem.integration.name === integration.name;
              const isMatched =
                matchedIds.size === 0 || matchedIds.has('integration:' + integration.name);
              const isScenario = highlightIntegrations.has(integration.name);
              return (
                <button
                  key={integration.name}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedItem({ kind: 'integration', integration })}
                  className={[
                    'text-left rounded-2xl border bg-white p-4 text-sm shadow-sm transition',
                    isSelected
                      ? 'border-slate-900 shadow-md'
                      : 'border-slate-200 hover:border-slate-400',
                    isMatched ? '' : 'opacity-50',
                    isScenario ? 'border-amber-400' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {integration.name}
                      </h3>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {integration.owner}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusTone[integration.status]}`}
                    >
                      {statusLabel[integration.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {integration.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {renderGlossary()}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Coming soon
          </p>
          <h2 className="text-xl font-semibold text-slate-900">Screenshots & clips</h2>
          <p className="text-sm text-slate-600">
            Short walkthrough clips will appear here so non-technical partners can connect each API dependency to the exact UI it powers.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="h-40 rounded-xl border border-dashed border-slate-300 bg-slate-100/60 p-4 text-sm text-slate-500">
              Sales dashboard clip placeholder
            </div>
            <div className="h-40 rounded-xl border border-dashed border-slate-300 bg-slate-100/60 p-4 text-sm text-slate-500">
              /dev console clip placeholder
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ label, description }: { label: string; description: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 text-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
