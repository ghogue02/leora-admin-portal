'use client';

import { useState } from 'react';
import {
  Database, Cloud, Zap, Mail, MessageSquare, MapPin, Brain,
  Calendar, CreditCard, Package, ShoppingCart, Users, BarChart3,
  Lock, Webhook, FileText, Truck, Building, Globe, ChevronDown,
  ChevronRight, ExternalLink, Activity, Shield, Boxes, Settings
} from 'lucide-react';

type IntegrationCategory = 'external' | 'internal' | 'infrastructure' | 'ai';

type Integration = {
  name: string;
  description: string;
  icon: any;
  category: IntegrationCategory;
  color: string;
  endpoints?: string[];
  envVars?: string[];
  purpose: string;
  status: 'active' | 'configured' | 'optional';
};

type APIRoute = {
  path: string;
  domain: string;
  methods: string[];
  description: string;
  auth: 'public' | 'sales' | 'admin' | 'portal' | 'api-key';
};

const EXTERNAL_INTEGRATIONS: Integration[] = [
  {
    name: 'Anthropic Claude',
    description: 'AI-powered features including product enrichment, document OCR, sales insights, and recommendations',
    icon: Brain,
    category: 'ai',
    color: 'from-purple-500 to-pink-500',
    endpoints: [
      'https://api.anthropic.com/v1/messages',
    ],
    envVars: ['ANTHROPIC_API_KEY'],
    purpose: 'Product enrichment, business card scanning, license verification, sales copilot, customer insights',
    status: 'active',
  },
  {
    name: 'Mailchimp',
    description: 'Email marketing campaigns, list management, and audience segmentation',
    icon: Mail,
    category: 'external',
    color: 'from-yellow-400 to-yellow-600',
    endpoints: [
      'https://{server}.api.mailchimp.com/3.0',
    ],
    envVars: ['MAILCHIMP_API_KEY', 'MAILCHIMP_SERVER_PREFIX'],
    purpose: 'Email campaigns, customer lists, marketing automation, webhook integration',
    status: 'active',
  },
  {
    name: 'Twilio',
    description: 'SMS messaging for customer communications and two-way conversations',
    icon: MessageSquare,
    category: 'external',
    color: 'from-red-500 to-red-700',
    endpoints: [
      'https://api.twilio.com/2010-04-01',
    ],
    envVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'TWILIO_MESSAGING_SERVICE_SID'],
    purpose: 'SMS messaging, delivery notifications, rep-customer communication, conversation tracking',
    status: 'active',
  },
  {
    name: 'Google Maps & Places',
    description: 'Address autocomplete, geocoding, routing, and place details',
    icon: MapPin,
    category: 'external',
    color: 'from-green-500 to-blue-500',
    endpoints: [
      'https://maps.googleapis.com/maps/api/place/findplacefromtext/json',
      'https://maps.googleapis.com/maps/api/place/details/json',
    ],
    envVars: ['GOOGLE_MAPS_API_KEY'],
    purpose: 'Address validation, geocoding, phone/website extraction, delivery routing',
    status: 'active',
  },
  {
    name: 'Mapbox',
    description: 'Territory visualization, heatmaps, and advanced geocoding',
    icon: Globe,
    category: 'external',
    color: 'from-blue-400 to-indigo-600',
    endpoints: [
      'https://api.mapbox.com/geocoding/v5',
      'https://api.mapbox.com/styles/v1',
    ],
    envVars: ['MAPBOX_ACCESS_TOKEN', 'MAPBOX_SECRET_TOKEN', 'NEXT_PUBLIC_MAPBOX_TOKEN'],
    purpose: 'Territory mapping, customer heatmaps, static map generation, route visualization',
    status: 'active',
  },
  {
    name: 'Google Calendar',
    description: 'Calendar sync for call planning and appointment scheduling',
    icon: Calendar,
    category: 'external',
    color: 'from-blue-500 to-blue-700',
    endpoints: [
      'https://www.googleapis.com/calendar/v3',
    ],
    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'],
    purpose: 'CARLA call plan sync, appointment scheduling, rep calendar integration',
    status: 'active',
  },
  {
    name: 'Microsoft Outlook',
    description: 'Outlook calendar integration via Microsoft Graph API',
    icon: Calendar,
    category: 'external',
    color: 'from-blue-600 to-blue-800',
    endpoints: [
      'https://graph.microsoft.com/v1.0',
    ],
    envVars: ['OUTLOOK_TENANT_ID', 'OUTLOOK_CLIENT_ID', 'OUTLOOK_CLIENT_SECRET'],
    purpose: 'Outlook calendar sync, appointment scheduling for enterprise customers',
    status: 'active',
  },
  {
    name: 'Supabase',
    description: 'PostgreSQL database and file storage infrastructure',
    icon: Database,
    category: 'infrastructure',
    color: 'from-emerald-500 to-teal-600',
    endpoints: [
      'https://{project}.supabase.co',
    ],
    envVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'DATABASE_URL', 'DIRECT_URL'],
    purpose: 'Database (PostgreSQL), file storage (business cards, documents), real-time subscriptions',
    status: 'active',
  },
  {
    name: 'SendGrid / Resend',
    description: 'Transactional email delivery for notifications and alerts',
    icon: Mail,
    category: 'external',
    color: 'from-blue-400 to-cyan-600',
    endpoints: [
      'https://api.sendgrid.com/v3',
      'https://api.resend.com',
    ],
    envVars: ['SENDGRID_API_KEY', 'RESEND_API_KEY', 'EMAIL_PROVIDER', 'FROM_EMAIL', 'FROM_NAME'],
    purpose: 'Order confirmations, invoice emails, password resets, system notifications',
    status: 'active',
  },
  {
    name: 'Stripe',
    description: 'Payment processing and subscription billing',
    icon: CreditCard,
    category: 'external',
    color: 'from-purple-600 to-indigo-700',
    endpoints: [
      'https://api.stripe.com/v1',
    ],
    envVars: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'],
    purpose: 'Payment processing, subscription management, invoicing (in development)',
    status: 'configured',
  },
  {
    name: 'OpenAI',
    description: 'Alternative AI provider for product enrichment',
    icon: Brain,
    category: 'ai',
    color: 'from-green-400 to-emerald-600',
    endpoints: [
      'https://api.openai.com/v1',
    ],
    envVars: ['OPENAI_API_KEY', 'OPENAI_API_URL'],
    purpose: 'Product enrichment, alternative to Anthropic for specific use cases',
    status: 'optional',
  },
  {
    name: 'Sage 50',
    description: 'Accounting system export for GL integration',
    icon: FileText,
    category: 'external',
    color: 'from-gray-600 to-gray-800',
    endpoints: [],
    envVars: [],
    purpose: 'Export orders, invoices, and customers to Sage 50 accounting software',
    status: 'active',
  },
];

const API_DOMAINS = {
  admin: {
    name: 'Admin Portal',
    icon: Shield,
    color: 'from-red-500 to-pink-600',
    description: 'Administrative functions for managing users, customers, inventory, and system configuration',
    routes: 142,
    keyFeatures: [
      'User & role management',
      'Customer CRUD operations',
      'Inventory management & pricing',
      'Audit logs & data integrity',
      'Bulk operations',
      'System configuration',
    ],
  },
  sales: {
    name: 'Sales Portal',
    icon: Users,
    color: 'from-blue-500 to-cyan-600',
    description: 'Sales rep tools for CRM, order entry, call planning, and customer management',
    routes: 168,
    keyFeatures: [
      'Customer management',
      'Order entry & management',
      'CARLA call planning',
      'Activity tracking',
      'Sample management',
      'Territory analytics',
      'Marketing campaigns',
    ],
  },
  portal: {
    name: 'Customer Portal',
    icon: ShoppingCart,
    color: 'from-green-500 to-emerald-600',
    description: 'Customer-facing portal for browsing catalog, placing orders, and managing account',
    routes: 12,
    keyFeatures: [
      'Product catalog browsing',
      'Shopping cart & checkout',
      'Order history',
      'Invoice access',
      'Account management',
    ],
  },
  operations: {
    name: 'Operations & Warehouse',
    icon: Truck,
    color: 'from-orange-500 to-amber-600',
    description: 'Warehouse operations, picking, delivery routing, and logistics',
    routes: 18,
    keyFeatures: [
      'Pick sheet generation',
      'Delivery route optimization',
      'Inventory locations',
      'Delivery tracking',
      'Warehouse notifications',
    ],
  },
  ai: {
    name: 'AI & Intelligence',
    icon: Brain,
    color: 'from-purple-500 to-pink-600',
    description: 'AI-powered features including insights, predictions, and recommendations',
    routes: 8,
    keyFeatures: [
      'Customer insights',
      'Next order predictions',
      'Product recommendations',
      'Frequently bought together',
      'Document OCR (business cards, licenses)',
    ],
  },
  integrations: {
    name: 'Integrations',
    icon: Zap,
    color: 'from-yellow-500 to-orange-600',
    description: 'External service integrations and webhooks',
    routes: 32,
    keyFeatures: [
      'Calendar sync (Google, Outlook)',
      'Mailchimp campaigns',
      'Twilio SMS webhooks',
      'Sage export',
      'Email tracking',
      'Integration health monitoring',
    ],
  },
};

export default function APILesson() {
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | IntegrationCategory>('all');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const filteredIntegrations = EXTERNAL_INTEGRATIONS.filter(
    (integration) => selectedCategory === 'all' || integration.category === selectedCategory
  );

  const totalRoutes = Object.values(API_DOMAINS).reduce((sum, domain) => sum + domain.routes, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Leora API Architecture
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            A comprehensive map of internal routes and external integrations
          </p>
          <p className="text-lg text-gray-500">
            Teaching Travis (and you) how everything connects
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total API Routes</p>
                <p className="text-3xl font-bold text-gray-900">{totalRoutes}</p>
              </div>
              <Activity className="h-10 w-10 text-blue-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">External Services</p>
                <p className="text-3xl font-bold text-gray-900">
                  {EXTERNAL_INTEGRATIONS.filter(i => i.category === 'external').length}
                </p>
              </div>
              <Cloud className="h-10 w-10 text-purple-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-pink-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">AI Integrations</p>
                <p className="text-3xl font-bold text-gray-900">
                  {EXTERNAL_INTEGRATIONS.filter(i => i.category === 'ai').length}
                </p>
              </div>
              <Brain className="h-10 w-10 text-pink-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">API Domains</p>
                <p className="text-3xl font-bold text-gray-900">{Object.keys(API_DOMAINS).length}</p>
              </div>
              <Boxes className="h-10 w-10 text-emerald-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* External Integrations Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">External Integrations</h2>
            <div className="flex gap-2">
              {(['all', 'external', 'ai', 'infrastructure'] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredIntegrations.map((integration) => {
              const Icon = integration.icon;
              const isExpanded = expandedIntegration === integration.name;

              return (
                <div
                  key={integration.name}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow"
                >
                  <div
                    className={`bg-gradient-to-r ${integration.color} p-6 text-white cursor-pointer`}
                    onClick={() => setExpandedIntegration(isExpanded ? null : integration.name)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{integration.name}</h3>
                          <p className="text-sm opacity-90 mt-1">{integration.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            integration.status === 'active'
                              ? 'bg-green-500'
                              : integration.status === 'configured'
                              ? 'bg-yellow-500'
                              : 'bg-gray-400'
                          }`}
                        >
                          {integration.status}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Purpose</h4>
                        <p className="text-sm text-gray-600">{integration.purpose}</p>
                      </div>

                      {integration.endpoints && integration.endpoints.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">API Endpoints</h4>
                          <div className="space-y-1">
                            {integration.endpoints.map((endpoint, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-xs font-mono bg-gray-50 p-2 rounded"
                              >
                                <ExternalLink className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-700">{endpoint}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {integration.envVars && integration.envVars.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            Environment Variables
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {integration.envVars.map((envVar, idx) => (
                              <code
                                key={idx}
                                className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-mono"
                              >
                                {envVar}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Internal API Domains */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Internal API Domains</h2>
          <p className="text-gray-600 mb-8">
            Our internal API is organized into {Object.keys(API_DOMAINS).length} major domains,
            containing {totalRoutes} total routes that power the entire platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(API_DOMAINS).map(([key, domain]) => {
              const Icon = domain.icon;
              const isSelected = selectedDomain === key;

              return (
                <div
                  key={key}
                  className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer ${
                    isSelected ? 'ring-4 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedDomain(isSelected ? null : key)}
                >
                  <div className={`bg-gradient-to-r ${domain.color} p-6 text-white`}>
                    <div className="flex items-center justify-between mb-3">
                      <Icon className="h-8 w-8" />
                      <span className="text-2xl font-bold">{domain.routes}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{domain.name}</h3>
                    <p className="text-sm opacity-90">{domain.description}</p>
                  </div>

                  {isSelected && (
                    <div className="p-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Key Features</h4>
                      <ul className="space-y-2">
                        {domain.keyFeatures.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-gray-500">
                          Base path: <code className="text-indigo-600">/api/{key}</code>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Data Flow Diagram */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Data Flow Architecture</h2>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="space-y-8">
              {/* User Interfaces Layer */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  User Interfaces
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200">
                    <p className="font-semibold text-blue-900">Sales Portal</p>
                    <p className="text-xs text-blue-700 mt-1">Field sales reps</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border-2 border-red-200">
                    <p className="font-semibold text-red-900">Admin Portal</p>
                    <p className="text-xs text-red-700 mt-1">Back office staff</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
                    <p className="font-semibold text-green-900">Customer Portal</p>
                    <p className="text-xs text-green-700 mt-1">End customers</p>
                  </div>
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-center">
                <div className="w-1 h-8 bg-gradient-to-b from-gray-300 to-gray-500" />
              </div>

              {/* API Layer */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  API Layer (Next.js Route Handlers)
                </h3>
                <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-lg p-6 border-2 border-purple-200">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-white/60 rounded p-2">
                      <code className="text-purple-700 font-semibold">/api/sales/*</code>
                    </div>
                    <div className="bg-white/60 rounded p-2">
                      <code className="text-purple-700 font-semibold">/api/admin/*</code>
                    </div>
                    <div className="bg-white/60 rounded p-2">
                      <code className="text-purple-700 font-semibold">/api/portal/*</code>
                    </div>
                    <div className="bg-white/60 rounded p-2">
                      <code className="text-purple-700 font-semibold">/api/operations/*</code>
                    </div>
                    <div className="bg-white/60 rounded p-2">
                      <code className="text-purple-700 font-semibold">/api/ai/*</code>
                    </div>
                    <div className="bg-white/60 rounded p-2">
                      <code className="text-purple-700 font-semibold">/api/integrations/*</code>
                    </div>
                  </div>
                  <p className="text-xs text-purple-700 mt-4 text-center">
                    380 route handlers • RESTful architecture • Role-based auth
                  </p>
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-center">
                <div className="w-1 h-8 bg-gradient-to-b from-gray-300 to-gray-500" />
              </div>

              {/* Services Layer */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-orange-600" />
                  Business Logic & External Services
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-lg p-4 border-2 border-orange-200">
                    <p className="font-semibold text-orange-900 mb-2">Internal Services</p>
                    <ul className="text-xs text-orange-700 space-y-1">
                      <li>• Pricing engine</li>
                      <li>• Inventory management</li>
                      <li>• Route optimization</li>
                      <li>• Sample ROI tracking</li>
                      <li>• Compliance rules</li>
                    </ul>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-rose-100 rounded-lg p-4 border-2 border-pink-200">
                    <p className="font-semibold text-pink-900 mb-2">External APIs</p>
                    <ul className="text-xs text-pink-700 space-y-1">
                      <li>• Anthropic Claude (AI)</li>
                      <li>• Google Maps/Places</li>
                      <li>• Mailchimp (Email)</li>
                      <li>• Twilio (SMS)</li>
                      <li>• Calendar sync</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-center">
                <div className="w-1 h-8 bg-gradient-to-b from-gray-300 to-gray-500" />
              </div>

              {/* Data Layer */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Database className="h-5 w-5 text-emerald-600" />
                  Data Layer
                </h3>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-lg p-6 border-2 border-emerald-200">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/60 rounded p-3">
                      <p className="font-semibold text-emerald-900">PostgreSQL (Supabase)</p>
                      <p className="text-xs text-emerald-700 mt-1">
                        99 entities • 2,285 lines schema • Multi-tenant
                      </p>
                    </div>
                    <div className="bg-white/60 rounded p-3">
                      <p className="font-semibold text-emerald-900">File Storage</p>
                      <p className="text-xs text-emerald-700 mt-1">
                        Business cards • Documents • PDFs
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-emerald-700 text-center">
                    Prisma ORM • Connection pooling • Row-level security • Audit logging
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Authentication Flow */}
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Authentication & Security</h2>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="h-6 w-6 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Admin Portal</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Auth:</strong> NextAuth.js</p>
                  <p><strong>Session:</strong> JWT + database</p>
                  <p><strong>Roles:</strong> sales.admin, warehouse.manager</p>
                  <p><strong>Permissions:</strong> RBAC with role inheritance</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Sales Portal</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Auth:</strong> Custom session cookies</p>
                  <p><strong>Session:</strong> Database-backed</p>
                  <p><strong>Roles:</strong> sales.rep, sales.manager</p>
                  <p><strong>Scope:</strong> Territory-based data access</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Customer Portal</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Auth:</strong> JWT tokens</p>
                  <p><strong>Session:</strong> Refresh token rotation</p>
                  <p><strong>Roles:</strong> portal.viewer, portal.admin</p>
                  <p><strong>Scope:</strong> Customer-scoped data only</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Security Features</h4>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-900">Multi-Tenant Isolation</p>
                  <p className="text-xs text-gray-600 mt-1">All queries filtered by tenantId</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-900">Audit Logging</p>
                  <p className="text-xs text-gray-600 mt-1">Every mutation tracked with before/after</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-900">Rate Limiting</p>
                  <p className="text-xs text-gray-600 mt-1">Per-tenant API rate limits</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-900">Data Encryption</p>
                  <p className="text-xs text-gray-600 mt-1">TLS in transit, encrypted at rest</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>
            Built with Next.js 15, React 19, Prisma, and ❤️ for the wine industry
          </p>
          <p className="mt-2">
            Questions? Ask Travis or check the docs at{' '}
            <code className="text-indigo-600">/docs</code>
          </p>
        </div>
      </div>
    </div>
  );
}
