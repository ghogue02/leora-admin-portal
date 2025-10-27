'use client';

/**
 * Example implementation of the DashboardGrid component
 * This shows how to integrate the drag-drop grid into the sales dashboard
 */

import { useState } from 'react';
import { DashboardGrid, WidgetType } from './DashboardGrid';
import { WIDGET_REGISTRY, getAvailableWidgets } from './WidgetLibrary';

export function DashboardGridExample() {
  // Initialize with default widgets
  const [activeWidgets, setActiveWidgets] = useState([
    WIDGET_REGISTRY['tasks-from-management'],  // TOP position widget
    WIDGET_REGISTRY['at-risk-customers'],
    WIDGET_REGISTRY['revenue-trend']
  ]);

  // Handle adding a new widget
  const handleAddWidget = (widgetType: WidgetType) => {
    const widget = WIDGET_REGISTRY[widgetType];
    if (widget && !activeWidgets.find(w => w.id === widget.id)) {
      setActiveWidgets([...activeWidgets, widget]);
    }
  };

  // Handle removing a widget
  const handleRemoveWidget = (widgetId: string) => {
    setActiveWidgets(activeWidgets.filter(w => w.id !== widgetId));
  };

  // Get widgets that are not currently displayed
  const availableWidgets = getAvailableWidgets(
    activeWidgets.map(w => w.id)
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardGrid
        widgets={activeWidgets}
        availableWidgets={availableWidgets}
        onAddWidget={handleAddWidget}
        onRemoveWidget={handleRemoveWidget}
      />
    </div>
  );
}

/**
 * Example: Pre-configured dashboard for different roles
 */
export function ManagerDashboard() {
  const [activeWidgets] = useState([
    WIDGET_REGISTRY['performance-metrics'],
    WIDGET_REGISTRY['revenue-trend'],
    WIDGET_REGISTRY['at-risk-customers'],
    WIDGET_REGISTRY['customer-health']
  ]);

  const availableWidgets = getAvailableWidgets(
    activeWidgets.map(w => w.id)
  );

  return (
    <DashboardGrid
      widgets={activeWidgets}
      availableWidgets={availableWidgets}
    />
  );
}

/**
 * Example: Minimal dashboard for sales reps
 */
export function SalesRepDashboard() {
  const [activeWidgets] = useState([
    WIDGET_REGISTRY['tasks-from-management'],
    WIDGET_REGISTRY['upcoming-events'],
    WIDGET_REGISTRY['revenue-trend']
  ]);

  const availableWidgets = getAvailableWidgets(
    activeWidgets.map(w => w.id)
  );

  return (
    <DashboardGrid
      widgets={activeWidgets}
      availableWidgets={availableWidgets}
    />
  );
}
