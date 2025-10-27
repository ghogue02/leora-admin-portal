'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricsList } from './MetricsList';
import { MetricEditor } from './MetricEditor';
import { MetricHistory } from './MetricHistory';
import { MetricDefinition } from '@/types/metrics';

/**
 * Metrics Administration Page
 * Phase 1.1: Metrics Definition UI
 *
 * Features:
 * - List all metric definitions
 * - Create/edit metric definitions
 * - View version history
 * - Deprecate metrics
 */
export default function MetricsAdminPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'history'>('list');
  const [selectedMetric, setSelectedMetric] = useState<MetricDefinition | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateNew = () => {
    setSelectedMetric(null);
    setActiveTab('editor');
  };

  const handleEditMetric = (metric: MetricDefinition) => {
    setSelectedMetric(metric);
    setActiveTab('editor');
  };

  const handleViewHistory = (metric: MetricDefinition) => {
    setSelectedMetric(metric);
    setActiveTab('history');
  };

  const handleSaveSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab('list');
    setSelectedMetric(null);
  };

  const handleCancel = () => {
    setActiveTab('list');
    setSelectedMetric(null);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Metrics Administration</h1>
            <p className="text-muted-foreground mt-2">
              Define and manage customer metrics for sales operations
            </p>
          </div>
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New Metric
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="list">All Metrics</TabsTrigger>
          <TabsTrigger value="editor">
            {selectedMetric ? 'Edit Metric' : 'New Metric'}
          </TabsTrigger>
          <TabsTrigger value="history" disabled={!selectedMetric}>
            Version History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <MetricsList
            onEdit={handleEditMetric}
            onViewHistory={handleViewHistory}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        <TabsContent value="editor" className="mt-6">
          <MetricEditor
            metric={selectedMetric}
            onSave={handleSaveSuccess}
            onCancel={handleCancel}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {selectedMetric && (
            <MetricHistory
              metricCode={selectedMetric.code}
              currentMetric={selectedMetric}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
