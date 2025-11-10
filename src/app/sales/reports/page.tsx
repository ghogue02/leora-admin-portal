'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportFiltersProvider } from './_context/ReportFiltersContext';
import { ReportFiltersBar } from './components/ReportFiltersBar';
import { DeliveryInsightsPanel } from './modules/DeliveryInsightsPanel';
import { SegmentPerformancePanel } from './modules/SegmentPerformancePanel';
import { EventMixPanel } from './modules/EventMixPanel';
import { CustomerHealthPanel } from './modules/CustomerHealthPanel';
import { ScheduledReportsPanel } from './modules/ScheduledReportsPanel';

export default function SalesReportsWorkspacePage() {
  return (
    <ReportFiltersProvider>
      <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Insights hub</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sales reports & automations</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Compare delivery mix, tag performance, event-driven revenue, and customer health side by side.
            Save the view you like, then schedule automated emails so managers and reps stay aligned.
          </p>
        </header>

        <ReportFiltersBar />

        <Tabs defaultValue="delivery" className="space-y-6">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="delivery">Delivery mix</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="health">Customer health</TabsTrigger>
            <TabsTrigger value="scheduled">Automations</TabsTrigger>
          </TabsList>

          <TabsContent value="delivery" className="space-y-4">
            <DeliveryInsightsPanel />
          </TabsContent>

          <TabsContent value="segments">
            <SegmentPerformancePanel />
          </TabsContent>

          <TabsContent value="events">
            <EventMixPanel />
          </TabsContent>

          <TabsContent value="health">
            <CustomerHealthPanel />
          </TabsContent>

          <TabsContent value="scheduled">
            <ScheduledReportsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </ReportFiltersProvider>
  );
}
