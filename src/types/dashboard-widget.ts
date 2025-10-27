/**
 * Dashboard Widget Types
 * Defines all widget configurations and types for the customizable dashboard
 */

export type WidgetSize = "small" | "medium" | "large";

export type WidgetType =
  | "at_risk_customers"
  | "revenue_trend"
  | "tasks_from_management"
  | "top_products"
  | "new_customers"
  | "customer_balances"
  | "upcoming_events"
  | "activity_summary"
  | "quota_progress"
  | "customers_due";

export interface WidgetConfig {
  // Common config options
  refreshInterval?: number; // in seconds
  showHeader?: boolean;

  // Widget-specific configs
  at_risk_customers?: {
    riskTypes?: Array<"AT_RISK_CADENCE" | "AT_RISK_REVENUE" | "DORMANT">;
    limit?: number;
  };

  revenue_trend?: {
    period?: "week" | "month" | "quarter";
    showComparison?: boolean;
  };

  tasks_from_management?: {
    showCompleted?: boolean;
    limit?: number;
  };

  top_products?: {
    period?: "week" | "month" | "quarter";
    limit?: number;
    sortBy?: "revenue" | "quantity";
  };

  new_customers?: {
    period?: "week" | "month";
    limit?: number;
  };

  customer_balances?: {
    threshold?: number; // Show customers with balance > threshold
    limit?: number;
  };

  upcoming_events?: {
    days?: number; // Next N days
    limit?: number;
  };

  activity_summary?: {
    period?: "week" | "month";
    activityTypes?: string[];
  };

  quota_progress?: {
    period?: "week" | "month" | "quarter" | "year";
  };

  customers_due?: {
    days?: number; // Next N days
    limit?: number;
  };
}

export interface DashboardWidget {
  id: string;
  tenantId: string;
  userId: string | null; // null = tenant default
  widgetType: WidgetType;
  position: number;
  size: WidgetSize;
  isVisible: boolean;
  config: WidgetConfig | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWidgetRequest {
  widgetType: WidgetType;
  position?: number;
  size?: WidgetSize;
  config?: WidgetConfig;
}

export interface UpdateWidgetRequest {
  position?: number;
  size?: WidgetSize;
  isVisible?: boolean;
  config?: WidgetConfig;
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
  availableWidgets: WidgetType[];
}

/**
 * Widget metadata for UI display
 */
export const WIDGET_METADATA: Record<WidgetType, {
  name: string;
  description: string;
  defaultSize: WidgetSize;
  category: "metrics" | "tasks" | "customers" | "analytics";
}> = {
  at_risk_customers: {
    name: "At Risk Customers",
    description: "Customers who need attention based on ordering patterns",
    defaultSize: "medium",
    category: "customers",
  },
  revenue_trend: {
    name: "Revenue Trend",
    description: "Revenue performance over time",
    defaultSize: "large",
    category: "analytics",
  },
  tasks_from_management: {
    name: "Tasks from Management",
    description: "Assigned tasks and action items",
    defaultSize: "medium",
    category: "tasks",
  },
  top_products: {
    name: "Top Products",
    description: "Best selling products by revenue or quantity",
    defaultSize: "medium",
    category: "analytics",
  },
  new_customers: {
    name: "New Customers",
    description: "Recently added customers",
    defaultSize: "small",
    category: "customers",
  },
  customer_balances: {
    name: "Customer Balances",
    description: "Customers with outstanding balances",
    defaultSize: "medium",
    category: "customers",
  },
  upcoming_events: {
    name: "Upcoming Events",
    description: "Scheduled appointments and events",
    defaultSize: "medium",
    category: "tasks",
  },
  activity_summary: {
    name: "Activity Summary",
    description: "Summary of recent sales activities",
    defaultSize: "small",
    category: "metrics",
  },
  quota_progress: {
    name: "Quota Progress",
    description: "Progress toward sales quotas",
    defaultSize: "medium",
    category: "metrics",
  },
  customers_due: {
    name: "Customers Due to Order",
    description: "Customers expected to order soon",
    defaultSize: "medium",
    category: "customers",
  },
};
