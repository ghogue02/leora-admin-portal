/**
 * SMS Template System
 *
 * Pre-built SMS templates for common customer communications.
 * Templates support variable substitution for personalization.
 */

export interface SMSTemplate {
  id: string;
  name: string;
  description: string;
  category: 'marketing' | 'notification' | 'service' | 'sales';
  body: string;
  variables: string[]; // List of {{variable}} placeholders
  maxLength: number;   // Character count
  examples?: Record<string, string>; // Example variable values
}

/**
 * Built-in SMS templates
 */
export const SMS_TEMPLATES: Record<string, SMSTemplate> = {
  WEEKLY_SPECIALS: {
    id: 'weekly_specials',
    name: 'Weekly Specials',
    description: 'Announce weekly wine and beverage specials',
    category: 'marketing',
    body: 'Hi {{firstName}}! This week at Well Crafted: {{special}}. Order by {{deadline}}. Reply STOP to opt out.',
    variables: ['firstName', 'special', 'deadline'],
    maxLength: 160,
    examples: {
      firstName: 'John',
      special: '20% off Chardonnay',
      deadline: 'Friday 5pm',
    },
  },

  DELIVERY_NOTIFICATION: {
    id: 'delivery_notification',
    name: 'Delivery Notification',
    description: 'Notify customer of upcoming delivery',
    category: 'notification',
    body: 'Hi {{firstName}}! Your Well Crafted order #{{orderNumber}} will be delivered {{deliveryDate}} between {{timeWindow}}.',
    variables: ['firstName', 'orderNumber', 'deliveryDate', 'timeWindow'],
    maxLength: 160,
    examples: {
      firstName: 'Sarah',
      orderNumber: '12345',
      deliveryDate: 'tomorrow',
      timeWindow: '2-4pm',
    },
  },

  TASTING_INVITATION: {
    id: 'tasting_invitation',
    name: 'Sample Tasting Invitation',
    description: 'Invite customer to taste new products',
    category: 'sales',
    body: 'Hi {{firstName}}! We have {{productName}} samples for you. When can we stop by? Reply with preferred day/time.',
    variables: ['firstName', 'productName'],
    maxLength: 160,
    examples: {
      firstName: 'Mike',
      productName: 'Italian Prosecco',
    },
  },

  ORDER_CONFIRMATION: {
    id: 'order_confirmation',
    name: 'Order Confirmation',
    description: 'Confirm order was received',
    category: 'notification',
    body: 'Order confirmed! {{itemCount}} items, ${{total}}. Delivery {{deliveryDate}}. Questions? Call {{phone}}.',
    variables: ['itemCount', 'total', 'deliveryDate', 'phone'],
    maxLength: 160,
    examples: {
      itemCount: '5',
      total: '450.00',
      deliveryDate: 'Wed 3/15',
      phone: '415-555-0100',
    },
  },

  CUSTOMER_CHECKIN: {
    id: 'customer_checkin',
    name: 'Customer Check-In',
    description: 'Touch base with customer',
    category: 'service',
    body: 'Hi {{firstName}}! How is everything with your recent order? Need to restock {{topProduct}}? Reply YES to schedule.',
    variables: ['firstName', 'topProduct'],
    maxLength: 160,
    examples: {
      firstName: 'Lisa',
      topProduct: 'Cabernet',
    },
  },

  PAYMENT_REMINDER: {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    description: 'Friendly payment reminder',
    category: 'service',
    body: 'Hi {{firstName}}, invoice #{{invoiceNumber}} for ${{amount}} is due {{dueDate}}. Pay online: {{paymentLink}}',
    variables: ['firstName', 'invoiceNumber', 'amount', 'dueDate', 'paymentLink'],
    maxLength: 160,
    examples: {
      firstName: 'Tom',
      invoiceNumber: 'INV-001',
      amount: '325.00',
      dueDate: 'Mar 30',
      paymentLink: 'wellcrafted.com/pay',
    },
  },

  REORDER_REMINDER: {
    id: 'reorder_reminder',
    name: 'Reorder Reminder',
    description: 'Remind customer to reorder popular items',
    category: 'sales',
    body: 'Time to restock {{productName}}? Last order was {{weeksAgo}} weeks ago. Reply YES and we\'ll call to place order.',
    variables: ['productName', 'weeksAgo'],
    maxLength: 160,
    examples: {
      productName: 'Pinot Noir',
      weeksAgo: '3',
    },
  },

  APPOINTMENT_REMINDER: {
    id: 'appointment_reminder',
    name: 'Appointment Reminder',
    description: 'Remind about scheduled appointment',
    category: 'notification',
    body: 'Reminder: {{salesRep}} will visit {{date}} at {{time}} for {{purpose}}. Reply CONFIRM or call {{phone}}.',
    variables: ['salesRep', 'date', 'time', 'purpose', 'phone'],
    maxLength: 160,
    examples: {
      salesRep: 'Alex',
      date: 'Tuesday',
      time: '2pm',
      purpose: 'spring catalog review',
      phone: '415-555-0100',
    },
  },
};

/**
 * Render template with variable substitution
 */
export function renderTemplate(
  templateId: string,
  variables: Record<string, string>
): { success: boolean; message?: string; error?: string } {
  const template = SMS_TEMPLATES[templateId];

  if (!template) {
    return {
      success: false,
      error: `Template not found: ${templateId}`,
    };
  }

  // Check for missing required variables
  const missingVars = template.variables.filter(v => !(v in variables));
  if (missingVars.length > 0) {
    return {
      success: false,
      error: `Missing required variables: ${missingVars.join(', ')}`,
    };
  }

  // Replace all {{variable}} placeholders
  let message = template.body;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    message = message.replace(new RegExp(placeholder, 'g'), value);
  }

  // Check message length
  if (message.length > template.maxLength) {
    return {
      success: false,
      error: `Rendered message is ${message.length} characters, exceeds limit of ${template.maxLength}`,
    };
  }

  return {
    success: true,
    message,
  };
}

/**
 * Get all templates by category
 */
export function getTemplatesByCategory(category: SMSTemplate['category']): SMSTemplate[] {
  return Object.values(SMS_TEMPLATES).filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): SMSTemplate | null {
  return SMS_TEMPLATES[templateId] || null;
}

/**
 * Validate template variables
 */
export function validateTemplateVariables(
  templateId: string,
  variables: Record<string, string>
): { valid: boolean; errors: string[] } {
  const template = SMS_TEMPLATES[templateId];

  if (!template) {
    return {
      valid: false,
      errors: [`Template not found: ${templateId}`],
    };
  }

  const errors: string[] = [];

  // Check for missing variables
  const missingVars = template.variables.filter(v => !(v in variables));
  if (missingVars.length > 0) {
    errors.push(`Missing variables: ${missingVars.join(', ')}`);
  }

  // Check for empty values
  const emptyVars = Object.entries(variables)
    .filter(([key, value]) => template.variables.includes(key) && !value.trim())
    .map(([key]) => key);

  if (emptyVars.length > 0) {
    errors.push(`Empty variables: ${emptyVars.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get suggested variables from customer data
 */
export function getSuggestedVariables(customer: any): Record<string, string> {
  return {
    firstName: customer.firstName || customer.name?.split(' ')[0] || 'there',
    lastName: customer.lastName || customer.name?.split(' ').slice(1).join(' ') || '',
    businessName: customer.businessName || customer.name || '',
    phone: customer.phone || '',
    email: customer.email || '',
  };
}
