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
};

type RouteNode = {
  id: string;
  label: string;
  count: number;
  ring: string;
  summary: string;
  connectsTo?: string[];
  integrationTypes?: IntegrationType[];
  integrationOwners?: string[];
};

type ConnectionTarget = {
  id: string;
  label: string;
  count: number;
  summary: string;
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
  },
  {
    name: 'Mailchimp',
    description: 'Campaign creation, segmentation, and deliverability monitoring.',
    status: 'active',
    type: 'external',
    owner: 'Marketing Ops',
  },
  {
    name: 'Twilio',
    description: 'Two-way SMS for order notifications and conversational outreach.',
    status: 'active',
    type: 'external',
    owner: 'Sales Engineering',
  },
  {
    name: 'Google Maps & Places',
    description: 'Places autocomplete, routing hints, and place metadata enrichment.',
    status: 'active',
    type: 'external',
    owner: 'Platform Services',
  },
  {
    name: 'Mapbox',
    description: 'Territory visualization and geo heatmaps for planners.',
    status: 'active',
    type: 'external',
    owner: 'Platform Services',
  },
  {
    name: 'Google Calendar',
    description: 'Calendar sync for call-plan scheduling and field rep scheduling.',
    status: 'active',
    type: 'external',
    owner: 'Sales Engineering',
  },
  {
    name: 'Microsoft Outlook',
    description: 'Microsoft Graph integration for executive and finance stakeholders.',
    status: 'active',
    type: 'external',
    owner: 'Sales Engineering',
  },
  {
    name: 'Supabase',
    description: 'Primary Postgres + storage platform for migrations and async jobs.',
    status: 'active',
    type: 'infrastructure',
    owner: 'Platform Services',
  },
  {
    name: 'SendGrid / Resend',
    description: 'Transactional email for notifications with failover provider.',
    status: 'active',
    type: 'external',
    owner: 'Platform Services',
  },
  {
    name: 'Stripe',
    description: 'Payment capture, invoicing experiments, and subscription billing.',
    status: 'configured',
    type: 'external',
    owner: 'Finance Tech',
  },
  {
    name: 'OpenAI',
    description: 'Alternate AI provider for enrichment and safety fallbacks.',
    status: 'optional',
    type: 'ai',
    owner: 'AI Platform',
  },
  {
    name: 'Sage 50',
    description: 'Accounting system export for GL integration and reconciliations.',
    status: 'active',
    type: 'infrastructure',
    owner: 'Finance Tech',
  },
];

const routeGroups: RouteNode[] = [
  {
    id: 'core',
    label: 'Core Platform',
    count: 180,
    ring: 'Core Services',
    summary: 'Next.js + Supabase orchestration: routing, jobs, auth, analytics, and automation.',
    connectsTo: ['external', 'ai', 'infrastructure'],
    integrationTypes: ['external', 'ai'],
    integrationOwners: ['Platform Services', 'AI Platform'],
  },
  {
    id: 'sales',
    label: 'Sales Ops',
    count: 92,
    ring: 'Domain',
    summary: 'Call plans, dashboards, sampling, and manager tooling used by the field team.',
    connectsTo: ['core', 'external', 'ai'],
    integrationTypes: ['external', 'ai'],
    integrationOwners: ['Sales Engineering', 'AI Platform'],
  },
  {
    id: 'ops',
    label: 'Operations',
    count: 74,
    ring: 'Domain',
    summary: 'Warehouse intake, order import, supplier sync, and logistics pipelines.',
    connectsTo: ['core', 'infrastructure'],
    integrationTypes: ['external', 'infrastructure'],
    integrationOwners: ['Platform Services'],
  },
  {
    id: 'finance',
    label: 'Finance',
    count: 38,
    ring: 'Domain',
    summary: 'Invoice batching, approvals, Sage exports, and payment status monitoring.',
    connectsTo: ['core', 'infrastructure'],
    integrationTypes: ['infrastructure'],
    integrationOwners: ['Finance Tech'],
  },
  {
    id: 'ai',
    label: 'AI + Copilot',
    count: 16,
    ring: 'Domain',
    summary: 'Document OCR, enrichment, recommendations, and natural-language tooling.',
    connectsTo: ['core', 'ai'],
    integrationTypes: ['ai'],
    integrationOwners: ['AI Platform'],
  },
  {
    id: 'auth',
    label: 'Identity',
    count: 24,
    ring: 'Shared',
    summary: 'Session validation, impersonation controls, and tenant hand-offs.',
    connectsTo: ['core'],
    integrationOwners: ['Platform Services'],
  },
  {
    id: 'infra',
    label: 'Infra Jobs',
    count: 26,
    ring: 'Shared',
    summary: 'Background jobs, cron tasks, observability webhooks, and Supabase automations.',
    connectsTo: ['core', 'infrastructure'],
    integrationTypes: ['infrastructure'],
    integrationOwners: ['Platform Services'],
  },
];

const connectionTargets: ConnectionTarget[] = [
  {
    id: 'external',
    label: 'External Services',
    count: 9,
    summary: 'Mailchimp, Twilio, Google Maps, and other customer-facing vendors.',
  },
  {
    id: 'ai',
    label: 'AI Vendors',
    count: 2,
    summary: 'Anthropic Claude and OpenAI failover models for Copilot.',
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    count: 4,
    summary: 'Supabase, Stripe, Sage 50, and internal job schedulers.',
  },
];

const routeLookup = Object.fromEntries(routeGroups.map((node) => [node.id, node])) as Record<
  RouteNode['id'],
  RouteNode
>;

const connectionTargetLookup = Object.fromEntries(
  connectionTargets.map((target) => [target.id, target])
) as Record<ConnectionTarget['id'], ConnectionTarget>;

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

export function LessonContent() {
  const [filter, setFilter] = useState<(typeof filters)[number]['value']>('all');
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({
    kind: 'route',
    node: routeGroups[0],
  });

  const filteredIntegrations = useMemo(() => {
    if (filter === 'all') return integrations;
    return integrations.filter((integration) => integration.type === filter);
  }, [filter]);

  const graph = useMemo(() => {
    const diameter = 520;
    const center = diameter / 2;
    const innerRadius = 90;
    const outerRadius = 200;

    const positionedRouteNodes = routeGroups.map((node, index) => {
      if (node.id === 'core') {
        return { ...node, x: center, y: center, radius: 60 };
      }
      const angle = (index / (routeGroups.length - 1)) * Math.PI * 2;
      return {
        ...node,
        x: center + innerRadius * Math.cos(angle),
        y: center + innerRadius * Math.sin(angle),
        radius: 34,
      };
    });

    const positionedTargets = connectionTargets.map((target, index) => {
      const angle = (index / connectionTargets.length) * Math.PI * 2;
      return {
        ...target,
        x: center + outerRadius * Math.cos(angle + Math.PI / 6),
        y: center + outerRadius * Math.sin(angle + Math.PI / 6),
        radius: 40,
      };
    });

    const lines = positionedRouteNodes
      .filter((node) => node.id !== 'core')
      .flatMap((node) => {
        const links = node.connectsTo ?? ['core'];
        return links.map((targetId) => {
          if (targetId === 'core') {
            const core = positionedRouteNodes.find((n) => n.id === 'core')!;
            return { from: node, to: core };
          }
          const target = positionedTargets.find((t) => t.id === targetId);
          if (!target) return null;
          return { from: node, to: target };
        });
      })
      .filter(Boolean) as { from: { x: number; y: number }; to: { x: number; y: number } }[];

    return { diameter, nodes: positionedRouteNodes, targets: positionedTargets, lines };
  }, []);

  const handleSvgKey = (
    event: KeyboardEvent<SVGGElement>,
    action: () => void
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const renderDetailPanel = () => {
    if (selectedItem.kind === 'route') {
      const route = selectedItem.node;
      const connectedRoutes =
        route.id === 'core'
          ? routeGroups
              .filter((candidate) => candidate.id !== 'core' && candidate.connectsTo?.includes('core'))
              .map((candidate) => candidate.label)
          : (route.connectsTo
              ?.filter((id) => routeLookup[id])
              .map((id) => routeLookup[id].label) ?? []);
      const externalLinks =
        route.connectsTo
          ?.filter((id) => connectionTargetLookup[id])
          .map((id) => connectionTargetLookup[id].label) ?? [];

      const relatedIntegrations = integrations
        .filter((integration) => {
          const matchesType = route.integrationTypes?.includes(integration.type);
          const matchesOwner = route.integrationOwners?.includes(integration.owner);
          return matchesType || matchesOwner;
        })
        .slice(0, 4);

      return (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Selection
          </p>
          <h3 className="text-xl font-semibold text-slate-900">{route.label}</h3>
          <p className="text-sm text-slate-600">{route.summary}</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-slate-700">Connected domains</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {connectedRoutes.length ? (
                  connectedRoutes.map((name) => (
                    <span key={name} className={chipClass}>
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">Uses core platform only</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700">External links</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {externalLinks.length ? (
                  externalLinks.map((name) => (
                    <span key={name} className={chipClass}>
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">No vendor dependencies</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700">Key integrations</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {relatedIntegrations.length ? (
                  relatedIntegrations.map((integration) => (
                    <button
                      key={integration.name}
                      type="button"
                      onClick={() => setSelectedItem({ kind: 'integration', integration })}
                      className={chipButtonClass}
                    >
                      {integration.name}
                    </button>
                  ))
                ) : (
                  <span className="text-slate-500">Runs fully in-platform</span>
                )}
              </dd>
            </div>
          </dl>
        </>
      );
    }

    if (selectedItem.kind === 'target') {
      const target = selectedItem.target;
      const inboundRoutes = routeGroups.filter((route) =>
        route.connectsTo?.includes(target.id)
      );

      return (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Vendor cluster
          </p>
          <h3 className="text-xl font-semibold text-slate-900">
            {target.label} · {target.count} touchpoints
          </h3>
          <p className="text-sm text-slate-600">{target.summary}</p>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Routes depending on this cluster
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {inboundRoutes.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => setSelectedItem({ kind: 'route', node: route })}
                  className={chipButtonClass}
                >
                  {route.label}
                </button>
              ))}
            </div>
          </div>
        </>
      );
    }

    const integration = selectedItem.integration;
    const touchingRoutes = routeGroups.filter(
      (route) =>
        route.integrationOwners?.includes(integration.owner) ||
        route.integrationTypes?.includes(integration.type)
    );

    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Integration
        </p>
        <h3 className="text-xl font-semibold text-slate-900">{integration.name}</h3>
        <p className="text-sm text-slate-600">{integration.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={chipClass}>{integration.owner}</span>
          <span className={chipClass}>{statusLabel[integration.status]}</span>
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Routes that call this integration
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {touchingRoutes.map((route) => (
              <button
                key={route.id}
                type="button"
                onClick={() => setSelectedItem({ kind: 'route', node: route })}
                className={chipButtonClass}
              >
                {route.label}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1.4fr]">
          <section className="space-y-6">
            <header className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
                Field Lesson
              </p>
              <h1 className="text-3xl font-semibold text-slate-900">Leora API Architecture</h1>
              <p className="text-base text-slate-600">
                A compact walkthrough of how internal domains, shared services, and vendor systems
                link together to power sales workflows.
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

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                System map
              </p>
              <h2 className="text-xl font-semibold text-slate-900">Route Mind Map</h2>
              <p className="text-sm text-slate-600">
                Click any node to drill deeper into the routes or vendor clusters it depends on.
              </p>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
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
                </defs>
                <rect width="100%" height="100%" fill="url(#nodeFade)" />
                {graph.lines.map((line, index) => (
                  <line
                    key={index.toString()}
                    x1={line.from.x}
                    y1={line.from.y}
                    x2={line.to.x}
                    y2={line.to.y}
                    stroke="#cbd5f5"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                ))}
                {graph.targets.map((target) => {
                  const isActive =
                    selectedItem.kind === 'target' && selectedItem.target.id === target.id;
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
                        fill="#f8fafc"
                        stroke={isActive ? '#0f172a' : '#cbd5f5'}
                        strokeWidth={isActive ? 3 : 2}
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
                        {target.count} touchpoints
                      </text>
                    </g>
                  );
                })}
                {graph.nodes.map((node) => {
                  const isActive =
                    selectedItem.kind === 'route' && selectedItem.node.id === node.id;
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
                        fill={isActive ? '#f8fafc' : '#fff'}
                        stroke={isActive ? '#0f172a' : '#94a3b8'}
                        strokeWidth={isActive ? 3 : 2}
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
                        {node.count} routes
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
              {renderDetailPanel()}
            </div>
          </section>
        </div>

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
              Ownership reflects current runbooks for on-call escalation.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filteredIntegrations.map((integration) => {
              const isSelected =
                selectedItem.kind === 'integration' &&
                selectedItem.integration.name === integration.name;
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
      </div>
    </div>
  );
}
