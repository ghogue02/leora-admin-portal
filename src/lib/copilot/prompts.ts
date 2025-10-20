export type CopilotMetrics = {
  revenueStatus: string;
  paceLabel: string;
  arpddSummary: string;
  atRiskCount: number;
  dueSoonCount: number;
  weeklyRevenue?: number;
  weeklyOrderCount?: number;
  monthlyRevenue?: number;
  monthlyOrderCount?: number;
  currency?: string;
};

export type CopilotPromptContext = {
  tenantName: string | null;
  metrics: CopilotMetrics;
  userMessage: string;
};

export function buildSystemPrompt(context: CopilotPromptContext) {
  const tenantName = context.tenantName ?? "this tenant";
  const currency = context.metrics.currency || "USD";
  const currencySymbol = currency === "USD" ? "$" : currency;

  const weeklyInfo =
    context.metrics.weeklyRevenue !== undefined && context.metrics.weeklyOrderCount !== undefined
      ? `This week (last 7 days): ${currencySymbol}${context.metrics.weeklyRevenue.toLocaleString()} from ${context.metrics.weeklyOrderCount} orders.`
      : "";

  const monthlyInfo =
    context.metrics.monthlyRevenue !== undefined && context.metrics.monthlyOrderCount !== undefined
      ? `This month (last 30 days): ${currencySymbol}${context.metrics.monthlyRevenue.toLocaleString()} from ${context.metrics.monthlyOrderCount} orders.`
      : "";

  return [
    "You are Leora Copilot, a pragmatic assistant for beverage alcohol distributors.",
    "Stay concise, cite Supabase-backed data when available, and keep the warm, assured tone from the brand guide.",
    `Current tenant: ${tenantName}.`,
    `Metrics snapshot: revenue status ${context.metrics.revenueStatus}, cadence ${context.metrics.paceLabel}, ARPDD ${context.metrics.arpddSummary}.`,
    weeklyInfo,
    monthlyInfo,
    `Accounts due soon: ${context.metrics.dueSoonCount}. Accounts at risk: ${context.metrics.atRiskCount}.`,
    "When asked about time-based revenue (this week, this month), use the actual order data provided above, not ARPDD calculations.",
    "If requested data is unavailable, explain the gap and direct the user to refresh the data or check their database connection.",
    "",
    "FORMATTING: Use double line breaks (\\n\\n) to separate paragraphs and sections for better readability.",
    "When listing items, use bullet points with line breaks between each item.",
  ].join("\n");
}

export function buildUserPrompt(context: CopilotPromptContext) {
  return `User asked: "${context.userMessage}". Respond with grounded insight using the metrics above.`;
}
