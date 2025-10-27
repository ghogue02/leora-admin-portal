/**
 * LeorAI Enhancements
 *
 * Advanced query templates and natural language processing
 * for improved business intelligence capabilities
 */

export interface QueryTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  prompt: string;
  variables?: string[];
  icon?: string;
  tags: string[];
}

export interface FollowUpSuggestion {
  text: string;
  category: 'insight' | 'action' | 'comparison' | 'trend';
  context?: string;
}

/**
 * Advanced query templates for LeorAI
 */
export const QUERY_TEMPLATES: QueryTemplate[] = [
  // Customer Analysis
  {
    id: 'customer-lifetime-value',
    category: 'Customer Analysis',
    name: 'Top Customers by Lifetime Value',
    description: 'Identify highest-value customers',
    prompt: 'Show me the top 10 customers by lifetime value with their total revenue and order count',
    tags: ['customer', 'revenue', 'analysis'],
  },
  {
    id: 'customer-churn-risk',
    category: 'Customer Analysis',
    name: 'Customers at Churn Risk',
    description: 'Find customers who may stop ordering',
    prompt: 'Which customers have high churn risk and haven\'t ordered recently?',
    tags: ['customer', 'risk', 'retention'],
  },
  {
    id: 'customer-growth-accounts',
    category: 'Customer Analysis',
    name: 'Growing Accounts',
    description: 'Customers with increasing order values',
    prompt: 'Show customers whose order values have been growing over the last 3 months',
    tags: ['customer', 'growth', 'trend'],
  },
  {
    id: 'customer-predictive',
    category: 'Customer Analysis',
    name: 'Next Order Predictions',
    description: 'AI-predicted next order dates',
    prompt: 'Show customers expected to order in the next 7 days based on AI predictions',
    tags: ['customer', 'prediction', 'ai'],
  },

  // Product Performance
  {
    id: 'product-trending',
    category: 'Product Performance',
    name: 'Trending Products',
    description: 'Products with increasing sales',
    prompt: 'What products are trending up this month compared to last month?',
    tags: ['product', 'trend', 'sales'],
  },
  {
    id: 'product-slow-moving',
    category: 'Product Performance',
    name: 'Slow-Moving Products',
    description: 'Products with declining sales',
    prompt: 'Which products have declining sales and need attention?',
    tags: ['product', 'inventory', 'alert'],
  },
  {
    id: 'product-recommendations',
    category: 'Product Performance',
    name: 'Product Affinity Analysis',
    description: 'Products frequently bought together',
    prompt: 'Show which products are most frequently bought together',
    tags: ['product', 'recommendation', 'affinity'],
  },
  {
    id: 'product-seasonal',
    category: 'Product Performance',
    name: 'Seasonal Product Analysis',
    description: 'Identify seasonal purchasing patterns',
    prompt: 'What products have strong seasonal sales patterns?',
    tags: ['product', 'seasonal', 'pattern'],
  },

  // Revenue & Performance
  {
    id: 'revenue-comparison',
    category: 'Revenue & Performance',
    name: 'Revenue Comparison',
    description: 'Compare current vs. previous period',
    prompt: 'Compare this month\'s revenue to last month and same month last year',
    tags: ['revenue', 'comparison', 'performance'],
  },
  {
    id: 'revenue-forecast',
    category: 'Revenue & Performance',
    name: 'Revenue Forecast',
    description: 'Projected revenue based on trends',
    prompt: 'What is the projected revenue for next month based on current trends?',
    tags: ['revenue', 'forecast', 'prediction'],
  },
  {
    id: 'performance-territory',
    category: 'Revenue & Performance',
    name: 'Territory Performance',
    description: 'Compare sales by territory',
    prompt: 'Show revenue and order count by territory for this quarter',
    tags: ['territory', 'performance', 'comparison'],
  },

  // Operational Insights
  {
    id: 'order-fulfillment',
    category: 'Operational Insights',
    name: 'Fulfillment Status',
    description: 'Orders pending fulfillment',
    prompt: 'Show all orders pending fulfillment and their age',
    tags: ['orders', 'fulfillment', 'operations'],
  },
  {
    id: 'inventory-alerts',
    category: 'Operational Insights',
    name: 'Low Inventory Alerts',
    description: 'Products running low on stock',
    prompt: 'Which products are running low on inventory?',
    tags: ['inventory', 'alert', 'operations'],
  },
  {
    id: 'delivery-performance',
    category: 'Operational Insights',
    name: 'Delivery Performance',
    description: 'On-time delivery metrics',
    prompt: 'What is our on-time delivery rate this month?',
    tags: ['delivery', 'performance', 'operations'],
  },

  // Samples & Marketing
  {
    id: 'sample-effectiveness',
    category: 'Samples & Marketing',
    name: 'Sample Effectiveness',
    description: 'Sample-to-order conversion',
    prompt: 'What is the conversion rate from samples to orders this quarter?',
    tags: ['samples', 'conversion', 'marketing'],
  },
  {
    id: 'sample-roi',
    category: 'Samples & Marketing',
    name: 'Sample ROI Analysis',
    description: 'Return on sample investment',
    prompt: 'Show ROI for each product used in sampling campaigns',
    tags: ['samples', 'roi', 'analysis'],
  },

  // Custom Queries
  {
    id: 'custom-cohort',
    category: 'Advanced Analysis',
    name: 'Customer Cohort Analysis',
    description: 'Analyze customer groups over time',
    prompt: 'Show customer retention by acquisition month for the last 6 months',
    tags: ['customer', 'cohort', 'retention'],
  },
  {
    id: 'custom-recency-frequency',
    category: 'Advanced Analysis',
    name: 'RFM Analysis',
    description: 'Recency, frequency, monetary segmentation',
    prompt: 'Segment customers by recency, frequency, and monetary value',
    tags: ['customer', 'segmentation', 'rfm'],
  },
];

/**
 * Generate intelligent follow-up questions based on context
 */
export function generateFollowUpQuestions(
  context: {
    userQuery: string;
    metrics?: any;
    recentResults?: any;
  }
): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];
  const { userQuery, metrics } = context;

  // Analyze user query for context
  const query = userQuery.toLowerCase();

  // Revenue-related follow-ups
  if (query.includes('revenue') || query.includes('sales')) {
    suggestions.push({
      text: 'Which customers contributed most to this revenue?',
      category: 'insight',
      context: 'revenue',
    });
    suggestions.push({
      text: 'How does this compare to the same period last year?',
      category: 'comparison',
      context: 'revenue',
    });
    suggestions.push({
      text: 'What products drove the revenue change?',
      category: 'insight',
      context: 'revenue',
    });
  }

  // Customer-related follow-ups
  if (query.includes('customer') || query.includes('account')) {
    suggestions.push({
      text: 'Show me AI-powered recommendations for these customers',
      category: 'action',
      context: 'customer',
    });
    suggestions.push({
      text: 'What is the churn risk for these accounts?',
      category: 'insight',
      context: 'customer',
    });
    suggestions.push({
      text: 'Which customers are expected to order soon?',
      category: 'insight',
      context: 'customer',
    });
  }

  // Product-related follow-ups
  if (query.includes('product') || query.includes('sku')) {
    suggestions.push({
      text: 'What products are frequently bought together?',
      category: 'insight',
      context: 'product',
    });
    suggestions.push({
      text: 'Show seasonal trends for these products',
      category: 'trend',
      context: 'product',
    });
    suggestions.push({
      text: 'Which customers should I recommend this to?',
      category: 'action',
      context: 'product',
    });
  }

  // Trend-related follow-ups
  if (query.includes('trend') || query.includes('pattern')) {
    suggestions.push({
      text: 'What factors might be driving this trend?',
      category: 'insight',
      context: 'trend',
    });
    suggestions.push({
      text: 'How can I capitalize on this trend?',
      category: 'action',
      context: 'trend',
    });
    suggestions.push({
      text: 'Is this trend consistent across all territories?',
      category: 'comparison',
      context: 'trend',
    });
  }

  // Risk-related follow-ups
  if (query.includes('risk') || query.includes('churn') || query.includes('alert')) {
    suggestions.push({
      text: 'What actions should I take to mitigate these risks?',
      category: 'action',
      context: 'risk',
    });
    suggestions.push({
      text: 'Show me the timeline of how this risk developed',
      category: 'insight',
      context: 'risk',
    });
    suggestions.push({
      text: 'Which accounts need immediate attention?',
      category: 'action',
      context: 'risk',
    });
  }

  // Metric-based suggestions
  if (metrics) {
    if (metrics.atRiskCount > 0) {
      suggestions.push({
        text: `Review ${metrics.atRiskCount} at-risk customers in detail`,
        category: 'action',
        context: 'risk',
      });
    }

    if (metrics.dueSoonCount > 0) {
      suggestions.push({
        text: `Contact ${metrics.dueSoonCount} customers due to order soon`,
        category: 'action',
        context: 'customer',
      });
    }

    if (metrics.revenueChangePercent && parseFloat(metrics.revenueChangePercent) < -10) {
      suggestions.push({
        text: 'What caused the revenue decline?',
        category: 'insight',
        context: 'revenue',
      });
    }
  }

  // Always include some general helpful suggestions
  suggestions.push({
    text: 'Show me opportunities for growth this week',
    category: 'insight',
    context: 'general',
  });

  // Limit to 6 most relevant suggestions
  return suggestions.slice(0, 6);
}

/**
 * Enhanced natural language understanding for queries
 */
export function enhanceQueryUnderstanding(query: string): {
  intent: string;
  entities: string[];
  timeframe?: string;
  metric?: string;
  suggestions: string[];
} {
  const normalized = query.toLowerCase();

  // Detect intent
  let intent = 'general';
  if (normalized.includes('show') || normalized.includes('list') || normalized.includes('display')) {
    intent = 'retrieve';
  } else if (normalized.includes('compare') || normalized.includes('versus')) {
    intent = 'compare';
  } else if (normalized.includes('predict') || normalized.includes('forecast')) {
    intent = 'predict';
  } else if (normalized.includes('why') || normalized.includes('explain')) {
    intent = 'analyze';
  } else if (normalized.includes('recommend') || normalized.includes('suggest')) {
    intent = 'recommend';
  }

  // Extract entities
  const entities: string[] = [];
  if (normalized.match(/customer|account|client/)) entities.push('customer');
  if (normalized.match(/product|sku|item/)) entities.push('product');
  if (normalized.match(/order|purchase|sale/)) entities.push('order');
  if (normalized.match(/revenue|sales|income/)) entities.push('revenue');
  if (normalized.match(/inventory|stock/)) entities.push('inventory');
  if (normalized.match(/sample/)) entities.push('sample');

  // Extract timeframe
  let timeframe: string | undefined;
  if (normalized.match(/today/)) timeframe = 'today';
  else if (normalized.match(/this week/)) timeframe = 'week';
  else if (normalized.match(/this month/)) timeframe = 'month';
  else if (normalized.match(/this quarter/)) timeframe = 'quarter';
  else if (normalized.match(/this year/)) timeframe = 'year';
  else if (normalized.match(/last (week|month|quarter|year)/)) {
    const match = normalized.match(/last (week|month|quarter|year)/);
    timeframe = match ? `last_${match[1]}` : undefined;
  }

  // Extract metric
  let metric: string | undefined;
  if (normalized.match(/revenue|sales/)) metric = 'revenue';
  else if (normalized.match(/count|number|quantity/)) metric = 'count';
  else if (normalized.match(/average|avg|mean/)) metric = 'average';
  else if (normalized.match(/growth|change|trend/)) metric = 'growth';

  // Generate query suggestions based on understanding
  const suggestions = QUERY_TEMPLATES
    .filter(template => {
      const templateTags = template.tags.join(' ');
      return entities.some(entity => templateTags.includes(entity));
    })
    .slice(0, 3)
    .map(t => t.prompt);

  return {
    intent,
    entities,
    timeframe,
    metric,
    suggestions,
  };
}

/**
 * Get query templates by category
 */
export function getTemplatesByCategory(category?: string): QueryTemplate[] {
  if (!category) return QUERY_TEMPLATES;

  return QUERY_TEMPLATES.filter(t => t.category === category);
}

/**
 * Search query templates
 */
export function searchTemplates(searchTerm: string): QueryTemplate[] {
  const term = searchTerm.toLowerCase();

  return QUERY_TEMPLATES.filter(template => {
    return (
      template.name.toLowerCase().includes(term) ||
      template.description.toLowerCase().includes(term) ||
      template.tags.some(tag => tag.includes(term)) ||
      template.category.toLowerCase().includes(term)
    );
  });
}

/**
 * Get template categories
 */
export function getTemplateCategories(): string[] {
  const categories = new Set(QUERY_TEMPLATES.map(t => t.category));
  return Array.from(categories);
}
