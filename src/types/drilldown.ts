/**
 * Type definitions for the Dashboard Drill-Down System
 *
 * This module provides comprehensive type definitions for all dashboard tile drill-down
 * interactions, including data structures, configurations, and API responses.
 *
 * @module types/drilldown
 * @author Leora Sales Dashboard
 * @version 1.0.0
 */

// ============================================================================
// Core Drill-Down Types
// ============================================================================

/**
 * Union type of all available dashboard drill-down tile types
 *
 * @example
 * ```typescript
 * const tileType: DashboardDrilldownType = 'weekly-quota';
 * ```
 */
export type DashboardDrilldownType =
  // Revenue & Quota Tiles
  | 'weekly-quota'           // Weekly quota progress and details
  | 'this-week-revenue'      // Current week revenue breakdown
  | 'last-week-revenue'      // Previous week comparison data
  | 'mtd-revenue'            // Month-to-Date revenue
  | 'last-month-revenue'     // Last Month total revenue
  | 'ytd-revenue'            // Year-to-Date revenue

  // Customer Tiles
  | 'unique-customers'       // Customers who ordered this week
  | 'customer-health'        // Customer health status overview
  | 'at-risk-cadence'        // Customers at risk due to ordering cadence
  | 'at-risk-revenue'        // Customers at risk due to revenue decline
  | 'dormant-customers'      // Inactive/dormant customer list
  | 'healthy-customers'      // Active and healthy customers
  | 'customers-due'          // Customers due to place orders
  | 'prospect-customers'     // Prospects (never ordered, < 90 days)
  | 'prospect-cold'          // Cold prospects (never ordered, 90+ days)

  // Activity & Task Tiles
  | 'upcoming-events'        // Calendar events and meetings
  | 'pending-tasks';         // Outstanding tasks and follow-ups

/**
 * Legacy drill-down types from existing implementation
 * Kept for backward compatibility
 */
export type LegacyDrilldownType =
  | 'top-customers'
  | 'top-products'
  | 'customer-risk'
  | 'monthly-trend'
  | 'samples'
  | 'order-status'
  | 'recent-activity';

/**
 * Combined drill-down type supporting both new and legacy systems
 */
export type DrilldownType = DashboardDrilldownType | LegacyDrilldownType | null;

// ============================================================================
// Data Structure Types
// ============================================================================

/**
 * Base structure for summary statistics displayed at the top of drill-down modals
 *
 * @example
 * ```typescript
 * const summary: DrilldownSummary = {
 *   totalRevenue: 125000,
 *   totalOrders: 45,
 *   averageOrderValue: 2777.78,
 *   growth: 12.5
 * };
 * ```
 */
export interface DrilldownSummary {
  [key: string]: string | number | boolean | null;
}

/**
 * Column configuration for data table display
 *
 * @example
 * ```typescript
 * const columns: DrilldownColumn[] = [
 *   { key: 'customerName', label: 'Customer' },
 *   {
 *     key: 'revenue',
 *     label: 'Revenue',
 *     format: (value) => `$${value.toLocaleString()}`
 *   }
 * ];
 * ```
 */
export interface DrilldownColumn {
  /** Unique key matching the data property */
  key: string;

  /** Display label for column header */
  label: string;

  /** Optional formatter function for cell values */
  format?: (value: any) => string;

  /** Optional alignment setting */
  align?: 'left' | 'center' | 'right';

  /** Optional sortable flag */
  sortable?: boolean;

  /** Optional width specification */
  width?: string | number;
}

/**
 * Chart data structure for visualizations
 */
export interface ChartData {
  /** Chart type */
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter';

  /** Chart data points */
  data: Array<{
    label: string;
    value: number;
    color?: string;
    metadata?: Record<string, any>;
  }>;

  /** Optional chart configuration */
  config?: {
    showLegend?: boolean;
    showGrid?: boolean;
    showTooltip?: boolean;
    colors?: string[];
  };
}

/**
 * Generic item structure for drill-down data tables
 */
export interface DrilldownItem {
  id: string | number;
  [key: string]: any;
}

/**
 * Main data payload structure for drill-down modals
 *
 * @example
 * ```typescript
 * const drilldownData: DrilldownDataPayload = {
 *   summary: {
 *     totalRevenue: 125000,
 *     orderCount: 45
 *   },
 *   items: [
 *     { id: 1, customerName: 'Acme Corp', revenue: 25000 }
 *   ],
 *   chartData: {
 *     type: 'bar',
 *     data: [{ label: 'Week 1', value: 30000 }]
 *   },
 *   insights: ['Revenue up 15% vs last week']
 * };
 * ```
 */
export interface DrilldownDataPayload {
  /** Summary statistics for top display */
  summary?: DrilldownSummary;

  /** Array of data items for table display */
  items?: DrilldownItem[];

  /** Optional chart visualization data */
  chartData?: ChartData;

  /** AI-generated insights and analysis */
  insights?: string[];

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Complete drill-down data structure including display configuration
 */
export interface DrilldownData {
  /** Modal title */
  title: string;

  /** Modal description/subtitle */
  description: string;

  /** Main data payload */
  data: DrilldownDataPayload;

  /** Column definitions for data table */
  columns: DrilldownColumn[];

  /** Optional chart configuration */
  charts?: ChartData;

  /** Timestamp of data generation */
  timestamp?: string;

  /** Data refresh interval in seconds */
  refreshInterval?: number;
}

// ============================================================================
// Specific Drill-Down Data Types
// ============================================================================

/**
 * Weekly quota drill-down specific data structure
 */
export interface WeeklyQuotaDrilldown extends DrilldownData {
  data: DrilldownDataPayload & {
    summary: {
      quota: number;
      achieved: number;
      remaining: number;
      percentComplete: number;
      daysRemaining: number;
    };
    items: Array<{
      id: string;
      salesperson: string;
      quota: number;
      achieved: number;
      percentComplete: number;
      status: 'on-track' | 'at-risk' | 'behind' | 'ahead';
    }>;
  };
}

/**
 * Revenue drill-down specific data structure
 */
export interface RevenueDrilldown extends DrilldownData {
  data: DrilldownDataPayload & {
    summary: {
      totalRevenue: number;
      orderCount: number;
      averageOrderValue: number;
      growth?: number;
    };
    items: Array<{
      id: string;
      date: string;
      customerName: string;
      orderNumber: string;
      revenue: number;
      status: string;
    }>;
  };
}

/**
 * Customer health drill-down specific data structure
 */
export interface CustomerHealthDrilldown extends DrilldownData {
  data: DrilldownDataPayload & {
    summary: {
      totalCustomers: number;
      healthy: number;
      atRisk: number;
      dormant: number;
    };
    items: Array<{
      id: string;
      customerName: string;
      healthScore: number;
      status: 'healthy' | 'at-risk-cadence' | 'at-risk-revenue' | 'dormant';
      lastOrderDate: string;
      totalRevenue: number;
      orderFrequency: number;
    }>;
  };
}

/**
 * Customer list drill-down (unique, dormant, healthy, etc.)
 */
export interface CustomerListDrilldown extends DrilldownData {
  data: DrilldownDataPayload & {
    summary: {
      totalCustomers: number;
      totalRevenue?: number;
      averageRevenue?: number;
    };
    items: Array<{
      id: string;
      customerName: string;
      contactPerson: string;
      email: string;
      phone: string;
      lastOrderDate: string;
      totalOrders: number;
      totalRevenue: number;
      status: string;
    }>;
  };
}

/**
 * Customers due to order drill-down
 */
export interface CustomersDueDrilldown extends DrilldownData {
  data: DrilldownDataPayload & {
    summary: {
      totalDue: number;
      overdue: number;
      dueSoon: number;
      expectedRevenue: number;
    };
    items: Array<{
      id: string;
      customerName: string;
      expectedOrderDate: string;
      daysOverdue: number;
      averageOrderValue: number;
      lastOrderDate: string;
      priority: 'high' | 'medium' | 'low';
    }>;
  };
}

/**
 * Upcoming events drill-down
 */
export interface UpcomingEventsDrilldown extends DrilldownData {
  data: DrilldownDataPayload & {
    summary: {
      totalEvents: number;
      thisWeek: number;
      nextWeek: number;
    };
    items: Array<{
      id: string;
      title: string;
      type: 'meeting' | 'call' | 'demo' | 'follow-up' | 'other';
      date: string;
      time: string;
      customerName?: string;
      location?: string;
      status: 'scheduled' | 'confirmed' | 'pending';
      priority: 'high' | 'medium' | 'low';
    }>;
  };
}

/**
 * Pending tasks drill-down
 */
export interface PendingTasksDrilldown extends DrilldownData {
  data: DrilldownDataPayload & {
    summary: {
      totalTasks: number;
      overdue: number;
      dueSoon: number;
      completed: number;
    };
    items: Array<{
      id: string;
      title: string;
      description: string;
      customerName?: string;
      dueDate: string;
      priority: 'high' | 'medium' | 'low';
      status: 'pending' | 'in-progress' | 'completed' | 'overdue';
      assignedTo: string;
    }>;
  };
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for drill-down tile behavior
 *
 * @example
 * ```typescript
 * const config: DrilldownConfig = {
 *   type: 'weekly-quota',
 *   enabled: true,
 *   refreshInterval: 300,
 *   cacheDuration: 60,
 *   permissions: ['view-quota']
 * };
 * ```
 */
export interface DrilldownConfig {
  /** Drill-down type identifier */
  type: DashboardDrilldownType;

  /** Whether drill-down is enabled for this tile */
  enabled: boolean;

  /** Auto-refresh interval in seconds (0 = disabled) */
  refreshInterval?: number;

  /** Cache duration in seconds */
  cacheDuration?: number;

  /** Required permissions to view this drill-down */
  permissions?: string[];

  /** Custom API endpoint (overrides default) */
  apiEndpoint?: string;

  /** Additional query parameters */
  queryParams?: Record<string, string | number | boolean>;

  /** Maximum number of items to display */
  maxItems?: number;

  /** Default sort configuration */
  defaultSort?: {
    column: string;
    direction: 'asc' | 'desc';
  };

  /** Export capabilities */
  exportFormats?: Array<'csv' | 'excel' | 'pdf' | 'json'>;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response wrapper for drill-down requests
 *
 * @example
 * ```typescript
 * const response: DrilldownApiResponse<WeeklyQuotaDrilldown> = {
 *   success: true,
 *   data: { title: '...', description: '...', data: {...} },
 *   timestamp: '2025-01-15T10:30:00Z'
 * };
 * ```
 */
export interface DrilldownApiResponse<T = DrilldownData> {
  /** Request success status */
  success: boolean;

  /** Drill-down data payload */
  data?: T;

  /** Error message if success is false */
  error?: string;

  /** Error code for client handling */
  errorCode?: string;

  /** Response timestamp */
  timestamp: string;

  /** Metadata about the response */
  meta?: {
    /** Query execution time in ms */
    executionTime?: number;

    /** Total records available */
    totalRecords?: number;

    /** Records returned in this response */
    returnedRecords?: number;

    /** Pagination cursor for next page */
    nextCursor?: string;

    /** Whether data was served from cache */
    fromCache?: boolean;
  };
}

/**
 * Batch drill-down request for multiple tiles
 */
export interface BatchDrilldownRequest {
  /** Array of drill-down types to fetch */
  types: DashboardDrilldownType[];

  /** Tenant ID for multi-tenant systems */
  tenantId?: string;

  /** Date range filter */
  dateRange?: {
    start: string;
    end: string;
  };

  /** Additional filters */
  filters?: Record<string, any>;
}

/**
 * Batch drill-down response
 */
export interface BatchDrilldownResponse {
  /** Request success status */
  success: boolean;

  /** Map of drill-down type to data */
  data: Partial<Record<DashboardDrilldownType, DrilldownData>>;

  /** Any errors that occurred for specific types */
  errors?: Partial<Record<DashboardDrilldownType, string>>;

  /** Response timestamp */
  timestamp: string;
}

// ============================================================================
// Component Prop Types
// ============================================================================

/**
 * Props for the main DrilldownModal component
 */
export interface DrilldownModalProps {
  /** Type of drill-down to display */
  type: DrilldownType;

  /** Callback when modal is closed */
  onClose: () => void;

  /** Optional tenant ID for multi-tenant systems */
  tenantId?: string;

  /** Optional initial data (skip API call) */
  initialData?: DrilldownData;

  /** Optional custom configuration */
  config?: Partial<DrilldownConfig>;

  /** Optional callback when data is loaded */
  onDataLoaded?: (data: DrilldownData) => void;

  /** Optional callback for export action */
  onExport?: (format: 'csv' | 'excel' | 'pdf' | 'json') => void;

  /**
   * Optional custom API endpoint for fetching drilldown data
   * If not provided, defaults to /api/sales/insights/drilldown
   */
  apiEndpoint?: string;
}

/**
 * Props for drill-down trigger tiles
 */
export interface DrilldownTileProps {
  /** Type of drill-down this tile opens */
  drilldownType: DashboardDrilldownType;

  /** Tile title */
  title: string;

  /** Tile value/metric */
  value: string | number;

  /** Optional subtitle */
  subtitle?: string;

  /** Optional icon */
  icon?: React.ReactNode;

  /** Optional trend indicator */
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };

  /** Optional custom onClick handler */
  onClick?: () => void;

  /** Whether drill-down is enabled */
  drilldownEnabled?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type guard to check if a drill-down type is valid
 *
 * @example
 * ```typescript
 * if (isDashboardDrilldownType(type)) {
 *   // type is narrowed to DashboardDrilldownType
 * }
 * ```
 */
export function isDashboardDrilldownType(type: any): type is DashboardDrilldownType {
  const validTypes: DashboardDrilldownType[] = [
    'weekly-quota',
    'this-week-revenue',
    'last-week-revenue',
    'mtd-revenue',
    'last-month-revenue',
    'ytd-revenue',
    'unique-customers',
    'customer-health',
    'at-risk-cadence',
    'at-risk-revenue',
    'dormant-customers',
    'healthy-customers',
    'customers-due',
    'prospect-customers',
    'prospect-cold',
    'upcoming-events',
    'pending-tasks',
  ];
  return validTypes.includes(type);
}

/**
 * Type guard to check if a drill-down type is a legacy type
 */
export function isLegacyDrilldownType(type: any): type is LegacyDrilldownType {
  const legacyTypes: LegacyDrilldownType[] = [
    'top-customers',
    'top-products',
    'customer-risk',
    'monthly-trend',
    'samples',
    'order-status',
    'recent-activity',
  ];
  return legacyTypes.includes(type);
}

/**
 * Filter configuration for drill-down data
 */
export interface DrilldownFilter {
  /** Field to filter on */
  field: string;

  /** Filter operator */
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between';

  /** Filter value(s) */
  value: any;

  /** Filter label for UI */
  label?: string;
}

/**
 * Sort configuration for drill-down data
 */
export interface DrilldownSort {
  /** Field to sort by */
  field: string;

  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Pagination configuration for drill-down data
 */
export interface DrilldownPagination {
  /** Current page number (1-indexed) */
  page: number;

  /** Items per page */
  pageSize: number;

  /** Total number of items */
  totalItems?: number;

  /** Total number of pages */
  totalPages?: number;
}

// ============================================================================
// Export Configuration
// ============================================================================

/**
 * Export configuration for drill-down data
 */
export interface DrilldownExportConfig {
  /** Export format */
  format: 'csv' | 'excel' | 'pdf' | 'json';

  /** Filename (without extension) */
  filename?: string;

  /** Include summary in export */
  includeSummary?: boolean;

  /** Include charts in export (PDF only) */
  includeCharts?: boolean;

  /** Include insights in export */
  includeInsights?: boolean;

  /** Columns to include (undefined = all) */
  columns?: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default configuration values for drill-downs
 */
export const DEFAULT_DRILLDOWN_CONFIG: Partial<DrilldownConfig> = {
  enabled: true,
  refreshInterval: 300, // 5 minutes
  cacheDuration: 60,    // 1 minute
  maxItems: 100,
  exportFormats: ['csv', 'excel'],
};

/**
 * Default pagination configuration
 */
export const DEFAULT_PAGINATION: DrilldownPagination = {
  page: 1,
  pageSize: 20,
};

/**
 * Status color mappings for consistent UI
 */
export const STATUS_COLORS = {
  healthy: 'green',
  'on-track': 'green',
  'at-risk': 'yellow',
  'at-risk-cadence': 'orange',
  'at-risk-revenue': 'orange',
  dormant: 'red',
  behind: 'red',
  ahead: 'blue',
  pending: 'gray',
  'in-progress': 'blue',
  completed: 'green',
  overdue: 'red',
  scheduled: 'blue',
  confirmed: 'green',
} as const;

/**
 * Priority color mappings
 */
export const PRIORITY_COLORS = {
  high: 'red',
  medium: 'yellow',
  low: 'gray',
} as const;
