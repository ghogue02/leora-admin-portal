'use client';

import { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const ResponsiveGridLayout = WidthProvider(Responsive);

export type WidgetType =
  | 'tasks-from-management'
  | 'at-risk-customers'
  | 'revenue-trend'
  | 'customer-health'
  | 'upcoming-events'
  | 'performance-metrics';

export interface Widget {
  id: string;
  type: WidgetType;
  component: React.ComponentType<any>;
  defaultSize: { w: number; h: number; minW?: number; minH?: number };
}

export interface DashboardGridProps {
  widgets: Widget[];
  availableWidgets: Widget[];
  onAddWidget?: (widgetType: WidgetType) => void;
  onRemoveWidget?: (widgetId: string) => void;
  className?: string;
}

const DEFAULT_LAYOUTS: Layouts = {
  lg: [],
  md: [],
  sm: [],
  xs: []
};

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4 };

export function DashboardGrid({
  widgets,
  availableWidgets,
  onAddWidget,
  onRemoveWidget,
  className
}: DashboardGridProps) {
  const [layouts, setLayouts] = useState<Layouts>(DEFAULT_LAYOUTS);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);

  // Load saved layouts from API
  useEffect(() => {
    const loadLayouts = async () => {
      try {
        const response = await fetch('/api/dashboard/widgets/layout');
        if (response.ok) {
          const data = await response.json();
          if (data.layouts) {
            setLayouts(data.layouts);
          }
        }
      } catch (error) {
        console.error('Failed to load layouts:', error);
      } finally {
        setMounted(true);
      }
    };

    void loadLayouts();
  }, []);

  // Generate default layouts from widgets
  const generateDefaultLayouts = useCallback(() => {
    const defaultLayouts: Layouts = {
      lg: [],
      md: [],
      sm: [],
      xs: []
    };

    widgets.forEach((widget, index) => {
      const { w, h, minW, minH } = widget.defaultSize;

      // Position widgets in a grid pattern
      const row = Math.floor(index / 2);
      const col = (index % 2) * 6;

      // Large screens (12 columns)
      defaultLayouts.lg.push({
        i: widget.id,
        x: col,
        y: row * h,
        w: w,
        h: h,
        minW: minW || 3,
        minH: minH || 2
      });

      // Medium screens (10 columns)
      defaultLayouts.md.push({
        i: widget.id,
        x: (index % 2) * 5,
        y: row * h,
        w: Math.min(w, 5),
        h: h,
        minW: minW || 3,
        minH: minH || 2
      });

      // Small screens (6 columns) - single column
      defaultLayouts.sm.push({
        i: widget.id,
        x: 0,
        y: index * h,
        w: 6,
        h: h,
        minW: 6,
        minH: minH || 2
      });

      // Extra small screens (4 columns) - single column
      defaultLayouts.xs.push({
        i: widget.id,
        x: 0,
        y: index * h,
        w: 4,
        h: h,
        minW: 4,
        minH: minH || 2
      });
    });

    return defaultLayouts;
  }, [widgets]);

  // Update layouts when widgets change
  useEffect(() => {
    if (mounted && widgets.length > 0 && layouts.lg.length === 0) {
      setLayouts(generateDefaultLayouts());
    }
  }, [mounted, widgets, layouts.lg.length, generateDefaultLayouts]);

  // Handle layout change
  const handleLayoutChange = (currentLayout: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts);
  };

  // Save layouts to API
  const handleSaveLayout = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/dashboard/widgets/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layouts })
      });

      if (!response.ok) {
        throw new Error('Failed to save layout');
      }

      // Show success feedback (you can add a toast notification here)
      console.log('Layout saved successfully');
    } catch (error) {
      console.error('Failed to save layout:', error);
      // Show error feedback (you can add a toast notification here)
    } finally {
      setSaving(false);
    }
  };

  // Reset to default layout
  const handleResetLayout = () => {
    const defaultLayouts = generateDefaultLayouts();
    setLayouts(defaultLayouts);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWidgetLibrary(!showWidgetLibrary)}
          >
            <Plus className="h-4 w-4" />
            Add Widget
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetLayout}
          >
            <RotateCcw className="h-4 w-4" />
            Reset Layout
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleSaveLayout}
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Layout'}
          </Button>
        </div>
      </div>

      {/* Widget Library */}
      {showWidgetLibrary && (
        <div className="mx-6 p-4 border rounded-lg bg-muted/50">
          <h3 className="text-sm font-medium mb-3">Available Widgets</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {availableWidgets.map((widget) => (
              <Button
                key={widget.type}
                variant="outline"
                size="sm"
                onClick={() => {
                  onAddWidget?.(widget.type);
                  setShowWidgetLibrary(false);
                }}
                className="justify-start"
              >
                <Plus className="h-3 w-3" />
                {widget.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Responsive Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={100}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        containerPadding={[24, 0]}
        margin={[16, 16]}
      >
        {widgets.map((widget) => (
          <div key={widget.id} className="bg-background border rounded-lg shadow-sm overflow-hidden">
            <widget.component
              onRemove={onRemoveWidget ? () => onRemoveWidget(widget.id) : undefined}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
