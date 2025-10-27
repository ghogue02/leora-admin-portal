'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Save, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { metricsApi, MetricsApiError } from '@/lib/api/metrics';
import { MetricDefinition, CreateMetricDefinitionInput, UpdateMetricDefinitionInput } from '@/types/metrics';

interface MetricEditorProps {
  metric: MetricDefinition | null;
  onSave: () => void;
  onCancel: () => void;
}

interface FormData {
  code: string;
  name: string;
  description: string;
  formulaField: string;
  formulaOperator: string;
  formulaValue: string;
}

export function MetricEditor({ metric, onSave, onCancel }: MetricEditorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!metric;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      code: metric?.code || '',
      name: metric?.name || '',
      description: metric?.description || '',
      formulaField: metric?.formula?.field || '',
      formulaOperator: metric?.formula?.operator || '',
      formulaValue: String(metric?.formula?.value || ''),
    },
  });

  useEffect(() => {
    reset({
      code: metric?.code || '',
      name: metric?.name || '',
      description: metric?.description || '',
      formulaField: metric?.formula?.field || '',
      formulaOperator: metric?.formula?.operator || '',
      formulaValue: String(metric?.formula?.value || ''),
    });
  }, [metric, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError(null);

      // Build formula if fields are provided
      const formula = data.formulaField && data.formulaOperator && data.formulaValue
        ? {
            field: data.formulaField,
            operator: data.formulaOperator,
            value: data.formulaValue,
          }
        : undefined;

      if (isEdit) {
        // Update existing metric
        const updateData: UpdateMetricDefinitionInput = {
          name: data.name,
          description: data.description,
          formula,
        };
        await metricsApi.update(metric.code, updateData);
        toast.success(`Metric "${data.name}" updated successfully (new version created)`);
      } else {
        // Create new metric
        const createData: CreateMetricDefinitionInput = {
          code: data.code,
          name: data.name,
          description: data.description,
          formula,
        };
        await metricsApi.create(createData);
        toast.success(`Metric "${data.name}" created successfully`);
      }

      onSave();
    } catch (err) {
      const errorMessage = err instanceof MetricsApiError
        ? err.message
        : `Failed to ${isEdit ? 'update' : 'create'} metric`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Metric Definition' : 'Create New Metric'}</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Updating a metric creates a new version while preserving history'
            : 'Define a new customer metric for sales operations'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                Metric Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                placeholder="e.g., at_risk_customer"
                disabled={isEdit || loading}
                {...register('code', {
                  required: 'Code is required',
                  pattern: {
                    value: /^[a-z0-9_]+$/,
                    message: 'Code must contain only lowercase letters, numbers, and underscores',
                  },
                  maxLength: {
                    value: 100,
                    message: 'Code must be 100 characters or less',
                  },
                })}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  Code cannot be changed after creation
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Display Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., At Risk Customer"
                disabled={loading}
                {...register('name', {
                  required: 'Name is required',
                  maxLength: {
                    value: 200,
                    message: 'Name must be 200 characters or less',
                  },
                })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="description"
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                placeholder="Full definition of what this metric represents..."
                disabled={loading}
                {...register('description', {
                  required: 'Description is required',
                  maxLength: {
                    value: 2000,
                    message: 'Description must be 2000 characters or less',
                  },
                })}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-4">Formula (Optional)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Define a calculation formula for this metric. This is optional for Phase 1.
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="formulaField">Field</Label>
                  <Input
                    id="formulaField"
                    placeholder="e.g., lastContactDate"
                    disabled={loading}
                    {...register('formulaField')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="formulaOperator">Operator</Label>
                  <Input
                    id="formulaOperator"
                    placeholder="e.g., >, <, =, !=, contains"
                    disabled={loading}
                    {...register('formulaOperator')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="formulaValue">Value</Label>
                  <Input
                    id="formulaValue"
                    placeholder="e.g., 30 days, true, 'value'"
                    disabled={loading}
                    {...register('formulaValue')}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (!isDirty && isEdit)}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : isEdit ? 'Update (New Version)' : 'Create Metric'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
