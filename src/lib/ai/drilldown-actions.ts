import Anthropic from "@anthropic-ai/sdk";

/**
 * AI-generated action steps for customer health drilldowns
 * Provides specific, prioritized recommendations for sales reps
 */

interface DrilldownActionRequest {
  drilldownType: string;
  customerData: any[];
  summary: Record<string, any>;
  salesRepName?: string;
}

interface ActionStep {
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  action: string;
  customerName?: string;
  reason: string;
}

/**
 * Generate AI-powered action steps for a customer drilldown
 * Uses Claude to analyze customer data and provide specific recommendations
 */
export async function generateDrilldownActions(
  request: DrilldownActionRequest
): Promise<ActionStep[]> {
  // Check if Anthropic API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[AI Actions] ANTHROPIC_API_KEY not configured - returning static actions");
    return getStaticActions(request);
  }

  try {
    console.log(`[AI Actions] Generating actions for ${request.drilldownType} with ${request.customerData.length} customers`);

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const prompt = buildPrompt(request);

    console.log(`[AI Actions] Calling Claude API...`);

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Parse AI response
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    console.log(`[AI Actions] Claude response received: ${content.text.substring(0, 200)}...`);

    const actionSteps = JSON.parse(content.text);
    console.log(`[AI Actions] ✅ Generated ${actionSteps.length} AI action steps`);
    return actionSteps;
  } catch (error) {
    console.error("[AI Actions] Error generating action steps:", error);
    console.log("[AI Actions] Falling back to static actions");
    // Fallback to static actions
    return getStaticActions(request);
  }
}

/**
 * Build context-aware prompt for each drilldown type
 */
function buildPrompt(request: DrilldownActionRequest): string {
  const { drilldownType, customerData, summary, salesRepName } = request;

  // Extract key customer details for targeted recommendations
  const customerList = customerData.slice(0, 10).map((c, idx) => {
    const details: any = {
      rank: idx + 1,
      name: c.name || c.customerName,
    };

    // Add relevant fields based on drilldown type
    if (c.riskMetrics) {
      details.daysOverdue = c.riskMetrics.daysOverdue;
      details.lastOrderDate = c.riskMetrics.lastOrderDate;
    }
    if (c.revenueMetrics) {
      details.establishedRevenue = c.revenueMetrics.establishedRevenue;
      details.recentRevenue = c.revenueMetrics.last30DaysRevenue || c.revenueMetrics.avgRecentRevenue;
      details.revenueDecline = c.revenueMetrics.revenueDecline30Days;
    }
    if (c.dormancyMetrics) {
      details.daysDormant = c.dormancyMetrics.daysSinceLastOrder;
      details.riskLevel = c.dormancyMetrics.riskLevel;
    }
    if (c.reactivation) {
      details.reactivationScore = c.reactivation.potentialScore;
      details.strategy = c.reactivation.strategy;
    }
    if (c.recovery) {
      details.recoveryPriority = c.recovery.priority;
      details.topAction = c.recovery.recommendedActions?.[0];
    }
    if (c.urgency) {
      details.urgency = c.urgency;
    }
    if (c.daysSinceCreated) {
      details.daysSinceCreated = c.daysSinceCreated;
    }

    return details;
  });

  const basePrompt = `You are an expert sales strategy AI assistant for a wine & beverage distributor.
Generate 5-7 SPECIFIC, actionable steps for ${salesRepName || "the sales rep"} to take RIGHT NOW.

Drilldown Category: ${drilldownType}
Summary: ${JSON.stringify(summary, null, 2)}

Top Priority Customers:
${JSON.stringify(customerList, null, 2)}

CRITICAL REQUIREMENTS:
1. MUST include specific customer names in each action (e.g., "Call Audi Richmond", "Visit The Space")
2. MUST specify the exact action type: "Call", "Visit in-person", "Send email", "Schedule tasting", "Send samples"
3. MUST explain WHY (days overdue, revenue decline %, historical value, etc.)
4. MUST order by urgency: CRITICAL first, then HIGH, MEDIUM, LOW
5. For CRITICAL/HIGH actions: Include specific customer name, metric, and deadline
6. Use actual data from the customer list above

Return ONLY valid JSON array:
[
  {
    "priority": "CRITICAL",
    "action": "Call [Actual Customer Name] today",
    "customerName": "[Actual Customer Name from data]",
    "reason": "[Specific metric: 46 days overdue, -32% revenue, etc.]"
  }
]

DO NOT return generic actions like "Review customers". ONLY return specific, customer-named actions.`;

  // Add type-specific context
  const typeSpecificContext = getTypeSpecificContext(drilldownType);

  return `${basePrompt}\n\n${typeSpecificContext}`;
}

/**
 * Get type-specific prompt context
 */
function getTypeSpecificContext(drilldownType: string): string {
  switch (drilldownType) {
    case "at-risk-cadence":
      return `FOCUS: These customers are OVERDUE on their normal ordering cadence.
- Prioritize by days overdue (most urgent first)
- Recommend immediate contact (call > email)
- Goal: Understand ordering pause, schedule next delivery
- Mention specific products they typically order if known`;

    case "at-risk-revenue":
      return `FOCUS: These customers are ordering but spending LESS than before.
- Prioritize by revenue decline percentage
- Recommend product review meetings or tastings
- Goal: Understand spend reduction, upsell opportunities
- Suggest complementary products or higher-margin items`;

    case "dormant-customers":
      return `FOCUS: These customers have STOPPED ordering completely.
- Prioritize by reactivation score and historical revenue
- Recommend win-back campaigns (samples, special offers)
- Goal: Re-engage and convert back to active
- Mention if they were high-value customers`;

    case "prospect-customers":
      return `FOCUS: These are NEW prospects who haven't placed first order yet.
- Prioritize by time in system (oldest first)
- Recommend tastings, demos, sample programs
- Goal: Convert to first order
- Suggest trial orders or starter packages`;

    case "prospect-cold":
      return `FOCUS: These are COLD leads who never converted.
- Prioritize by engagement history
- Recommend final re-engagement or archiving
- Goal: Clean up pipeline or final conversion attempt
- Identify if worth continued effort`;

    case "healthy-customers":
      return `FOCUS: These customers are ordering normally - RETAIN them.
- Prioritize by revenue potential
- Recommend upsell/cross-sell opportunities
- Goal: Increase wallet share and deepen relationship
- Suggest complementary products or volume discounts`;

    default:
      return "Provide specific, actionable recommendations based on the customer data.";
  }
}

/**
 * Fallback static actions when AI is unavailable
 * Generate targeted actions with specific customer names
 */
function getStaticActions(request: DrilldownActionRequest): ActionStep[] {
  const { drilldownType, customerData, summary } = request;

  const actions: ActionStep[] = [];

  // Extract top customers with names
  const topCustomers = customerData.slice(0, 5);

  if (drilldownType === "at-risk-cadence") {
    topCustomers.forEach((customer, index) => {
      const name = customer.name || customer.customerName;
      const daysOverdue = customer.riskMetrics?.daysOverdue || 0;
      const priority = daysOverdue > 14 ? "CRITICAL" : daysOverdue > 7 ? "HIGH" : "MEDIUM";

      actions.push({
        priority,
        action: `Call ${name} to understand ordering delay`,
        customerName: name,
        reason: `${daysOverdue} days overdue on normal ordering cadence`,
      });
    });
  } else if (drilldownType === "at-risk-revenue") {
    topCustomers.forEach((customer, index) => {
      const name = customer.name || customer.customerName;
      const decline = customer.revenueMetrics?.revenueDecline30Days || 0;
      const revenue = customer.revenueMetrics?.establishedRevenue || 0;

      actions.push({
        priority: decline > 30 ? "CRITICAL" : decline > 20 ? "HIGH" : "MEDIUM",
        action: `Schedule product review meeting with ${name}`,
        customerName: name,
        reason: `Revenue down ${decline}% from $${revenue.toLocaleString()} baseline`,
      });
    });
  } else if (drilldownType === "dormant-customers") {
    topCustomers.forEach((customer, index) => {
      const name = customer.name || customer.customerName;
      const daysDormant = customer.dormancyMetrics?.daysSinceLastOrder || 0;
      const revenue = customer.historicalMetrics?.establishedRevenue || 0;

      actions.push({
        priority: revenue > 5000 ? "HIGH" : "MEDIUM",
        action: `Win-back outreach to ${name}`,
        customerName: name,
        reason: `${daysDormant} days inactive, was $${revenue.toLocaleString()}/year customer`,
      });
    });
  } else if (drilldownType === "prospect-customers") {
    topCustomers.forEach((customer, index) => {
      const name = customer.customerName || customer.name;
      const daysOld = customer.daysSinceCreated || 0;

      actions.push({
        priority: daysOld > 60 ? "HIGH" : "MEDIUM",
        action: `Schedule tasting appointment with ${name}`,
        customerName: name,
        reason: `${daysOld} days in system without first order`,
      });
    });
  } else if (drilldownType === "healthy-customers") {
    topCustomers.forEach((customer, index) => {
      const name = customer.name || customer.customerName;
      const revenue = customer.revenueMetrics?.establishedRevenue || 0;

      if (index < 3 && revenue > 3000) {
        actions.push({
          priority: "MEDIUM",
          action: `Explore upsell opportunities with ${name}`,
          customerName: name,
          reason: `Top performer with $${revenue.toLocaleString()}/year revenue`,
        });
      }
    });
  }

  return actions;
}

/**
 * Format action steps for display in UI
 */
export function formatActionSteps(actions: ActionStep[]): string[] {
  return actions.map((step, index) => {
    const priorityEmoji = {
      CRITICAL: "🔴",
      HIGH: "🟠",
      MEDIUM: "🟡",
      LOW: "⚪",
    }[step.priority];

    return `${priorityEmoji} ${step.priority}: ${step.action} — ${step.reason}`;
  });
}
