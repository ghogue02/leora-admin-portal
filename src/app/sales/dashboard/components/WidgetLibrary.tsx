'use client';

import { Widget, WidgetType } from './DashboardGrid';
import { TasksFromManagement } from '../widgets/TasksFromManagement';
import { AtRiskCustomers } from '../widgets/AtRiskCustomers';
import { RevenueTrend } from '../widgets/RevenueTrend';

/**
 * Registry of all available dashboard widgets
 */
export const WIDGET_REGISTRY: Record<WidgetType, Widget> = {
  'tasks-from-management': {
    id: 'tasks-from-management',
    type: 'tasks-from-management',
    component: TasksFromManagement,
    defaultSize: { w: 6, h: 3, minW: 4, minH: 2 }
  },
  'at-risk-customers': {
    id: 'at-risk-customers',
    type: 'at-risk-customers',
    component: AtRiskCustomers,
    defaultSize: { w: 6, h: 3, minW: 4, minH: 2 }
  },
  'revenue-trend': {
    id: 'revenue-trend',
    type: 'revenue-trend',
    component: RevenueTrend,
    defaultSize: { w: 6, h: 4, minW: 4, minH: 3 }
  },
  'customer-health': {
    id: 'customer-health',
    type: 'customer-health',
    component: () => <div>Customer Health Widget (Coming Soon)</div>,
    defaultSize: { w: 6, h: 3, minW: 4, minH: 2 }
  },
  'upcoming-events': {
    id: 'upcoming-events',
    type: 'upcoming-events',
    component: () => <div>Upcoming Events Widget (Coming Soon)</div>,
    defaultSize: { w: 6, h: 3, minW: 4, minH: 2 }
  },
  'performance-metrics': {
    id: 'performance-metrics',
    type: 'performance-metrics',
    component: () => <div>Performance Metrics Widget (Coming Soon)</div>,
    defaultSize: { w: 12, h: 2, minW: 6, minH: 2 }
  }
};

/**
 * Get widget configuration by type
 */
export function getWidget(type: WidgetType): Widget {
  return WIDGET_REGISTRY[type];
}

/**
 * Get all available widgets
 */
export function getAllWidgets(): Widget[] {
  return Object.values(WIDGET_REGISTRY);
}

/**
 * Get available widgets that are not currently in use
 */
export function getAvailableWidgets(activeWidgetIds: string[]): Widget[] {
  return Object.values(WIDGET_REGISTRY).filter(
    widget => !activeWidgetIds.includes(widget.id)
  );
}
