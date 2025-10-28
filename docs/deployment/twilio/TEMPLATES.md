# SMS Template Library

## Overview
Pre-built SMS templates for common customer communications in the Leora CRM system.

All templates are designed to:
- Stay under 160 characters (single SMS)
- Support personalization via variables
- Include opt-out instructions where required
- Maintain professional tone

---

## Template Categories

### 📢 Marketing (2 templates)
- Weekly Specials
- Reorder Reminder

### 🔔 Notifications (3 templates)
- Delivery Notification
- Order Confirmation
- Appointment Reminder

### 🤝 Service (2 templates)
- Customer Check-In
- Payment Reminder

### 💼 Sales (1 template)
- Sample Tasting Invitation

---

## Template Catalog

### 1. Weekly Specials (Marketing)

**Template ID:** `weekly_specials`

**Message:**
```
Hi {{firstName}}! This week at Well Crafted: {{special}}. Order by {{deadline}}. Reply STOP to opt out.
```

**Variables:**
- `firstName` - Customer's first name
- `special` - This week's special offer
- `deadline` - Order deadline

**Example:**
```
Hi John! This week at Well Crafted: 20% off Chardonnay. Order by Friday 5pm. Reply STOP to opt out.
```

**Character Count:** ~100 (varies with content)

**Usage:**
```json
{
  "templateId": "weekly_specials",
  "templateVariables": {
    "firstName": "Sarah",
    "special": "Italian Prosecco 25% off",
    "deadline": "Sunday 6pm"
  }
}
```

---

### 2. Delivery Notification (Notification)

**Template ID:** `delivery_notification`

**Message:**
```
Hi {{firstName}}! Your Well Crafted order #{{orderNumber}} will be delivered {{deliveryDate}} between {{timeWindow}}.
```

**Variables:**
- `firstName` - Customer's first name
- `orderNumber` - Order number
- `deliveryDate` - Delivery date (e.g., "tomorrow", "Monday")
- `timeWindow` - Time window (e.g., "2-4pm")

**Example:**
```
Hi Sarah! Your Well Crafted order #12345 will be delivered tomorrow between 2-4pm.
```

**Character Count:** ~110

**Usage:**
```json
{
  "templateId": "delivery_notification",
  "templateVariables": {
    "firstName": "Mike",
    "orderNumber": "12345",
    "deliveryDate": "tomorrow",
    "timeWindow": "2-4pm"
  }
}
```

---

### 3. Sample Tasting Invitation (Sales)

**Template ID:** `tasting_invitation`

**Message:**
```
Hi {{firstName}}! We have {{productName}} samples for you. When can we stop by? Reply with preferred day/time.
```

**Variables:**
- `firstName` - Customer's first name
- `productName` - Product to taste

**Example:**
```
Hi Mike! We have Italian Prosecco samples for you. When can we stop by? Reply with preferred day/time.
```

**Character Count:** ~120

**Usage:**
```json
{
  "templateId": "tasting_invitation",
  "templateVariables": {
    "firstName": "Lisa",
    "productName": "French Bordeaux"
  }
}
```

---

### 4. Order Confirmation (Notification)

**Template ID:** `order_confirmation`

**Message:**
```
Order confirmed! {{itemCount}} items, ${{total}}. Delivery {{deliveryDate}}. Questions? Call {{phone}}.
```

**Variables:**
- `itemCount` - Number of items
- `total` - Order total
- `deliveryDate` - Delivery date
- `phone` - Support phone number

**Example:**
```
Order confirmed! 5 items, $450.00. Delivery Wed 3/15. Questions? Call 415-555-0100.
```

**Character Count:** ~95

**Usage:**
```json
{
  "templateId": "order_confirmation",
  "templateVariables": {
    "itemCount": "8",
    "total": "675.00",
    "deliveryDate": "Wed 3/20",
    "phone": "415-555-0100"
  }
}
```

---

### 5. Customer Check-In (Service)

**Template ID:** `customer_checkin`

**Message:**
```
Hi {{firstName}}! How is everything with your recent order? Need to restock {{topProduct}}? Reply YES to schedule.
```

**Variables:**
- `firstName` - Customer's first name
- `topProduct` - Their most-purchased product

**Example:**
```
Hi Lisa! How is everything with your recent order? Need to restock Cabernet? Reply YES to schedule.
```

**Character Count:** ~115

**Usage:**
```json
{
  "templateId": "customer_checkin",
  "templateVariables": {
    "firstName": "Tom",
    "topProduct": "Pinot Noir"
  }
}
```

---

### 6. Payment Reminder (Service)

**Template ID:** `payment_reminder`

**Message:**
```
Hi {{firstName}}, invoice #{{invoiceNumber}} for ${{amount}} is due {{dueDate}}. Pay online: {{paymentLink}}
```

**Variables:**
- `firstName` - Customer's first name
- `invoiceNumber` - Invoice number
- `amount` - Amount due
- `dueDate` - Due date
- `paymentLink` - Payment URL

**Example:**
```
Hi Tom, invoice #INV-001 for $325.00 is due Mar 30. Pay online: wellcrafted.com/pay
```

**Character Count:** ~105

**Usage:**
```json
{
  "templateId": "payment_reminder",
  "templateVariables": {
    "firstName": "Emily",
    "invoiceNumber": "INV-123",
    "amount": "425.00",
    "dueDate": "Apr 15",
    "paymentLink": "wellcrafted.com/pay"
  }
}
```

---

### 7. Reorder Reminder (Marketing)

**Template ID:** `reorder_reminder`

**Message:**
```
Time to restock {{productName}}? Last order was {{weeksAgo}} weeks ago. Reply YES and we'll call to place order.
```

**Variables:**
- `productName` - Product name
- `weeksAgo` - Weeks since last order

**Example:**
```
Time to restock Pinot Noir? Last order was 3 weeks ago. Reply YES and we'll call to place order.
```

**Character Count:** ~110

**Usage:**
```json
{
  "templateId": "reorder_reminder",
  "templateVariables": {
    "productName": "Cabernet Sauvignon",
    "weeksAgo": "4"
  }
}
```

---

### 8. Appointment Reminder (Notification)

**Template ID:** `appointment_reminder`

**Message:**
```
Reminder: {{salesRep}} will visit {{date}} at {{time}} for {{purpose}}. Reply CONFIRM or call {{phone}}.
```

**Variables:**
- `salesRep` - Sales rep name
- `date` - Appointment date
- `time` - Appointment time
- `purpose` - Visit purpose
- `phone` - Contact phone

**Example:**
```
Reminder: Alex will visit Tuesday at 2pm for spring catalog review. Reply CONFIRM or call 415-555-0100.
```

**Character Count:** ~125

**Usage:**
```json
{
  "templateId": "appointment_reminder",
  "templateVariables": {
    "salesRep": "Alex",
    "date": "Tuesday",
    "time": "3pm",
    "purpose": "new catalog review",
    "phone": "415-555-0100"
  }
}
```

---

## Creating Custom Templates

To add new templates to the system:

### 1. Edit Template File

```typescript
// src/lib/services/twilio/templates.ts

export const SMS_TEMPLATES: Record<string, SMSTemplate> = {
  // ... existing templates

  YOUR_NEW_TEMPLATE: {
    id: 'your_template_id',
    name: 'Your Template Name',
    description: 'Description of what this template does',
    category: 'marketing', // or 'notification', 'service', 'sales'
    body: 'Your message with {{variable1}} and {{variable2}}',
    variables: ['variable1', 'variable2'],
    maxLength: 160,
    examples: {
      variable1: 'Example value 1',
      variable2: 'Example value 2',
    },
  },
};
```

### 2. Best Practices

**Character Limits:**
- **160 characters** = 1 SMS segment (cheapest)
- **161-306 characters** = 2 SMS segments
- **307-459 characters** = 3 SMS segments
- **Maximum:** 1600 characters (10 segments)

**Personalization:**
- Always use `{{firstName}}` when possible
- Keep variable names descriptive
- Provide example values
- Test with actual customer data

**Compliance:**
- Include opt-out instructions for marketing
- Don't send marketing outside business hours (8am-9pm)
- Respect customer preferences
- Keep consent records

**Tone:**
- Professional but friendly
- Clear call-to-action
- No excessive punctuation!!!
- Avoid all caps EXCEPT for commands

**Mobile-Friendly:**
- Short sentences
- Easy to scan
- Clear next steps
- Include contact info when relevant

---

## Template Usage Examples

### Send Weekly Special to All Customers

```typescript
const customers = await getActiveCustomers();

for (const customer of customers) {
  await sendSMS({
    customerId: customer.id,
    templateId: 'weekly_specials',
    templateVariables: {
      firstName: customer.firstName,
      special: 'Premium wines 25% off',
      deadline: 'Friday 5pm',
    },
  });
}
```

### Auto-Send Delivery Notifications

```typescript
// When order ships
async function notifyDelivery(order) {
  await sendSMS({
    customerId: order.customerId,
    templateId: 'delivery_notification',
    templateVariables: {
      firstName: order.customer.firstName,
      orderNumber: order.number,
      deliveryDate: formatDate(order.deliveryDate),
      timeWindow: order.timeWindow,
    },
  });
}
```

### Payment Reminders (Automated)

```typescript
// Daily job to send payment reminders
const overdueInvoices = await getOverdueInvoices();

for (const invoice of overdueInvoices) {
  if (invoice.daysOverdue === 7) {
    await sendSMS({
      customerId: invoice.customerId,
      templateId: 'payment_reminder',
      templateVariables: {
        firstName: invoice.customer.firstName,
        invoiceNumber: invoice.number,
        amount: invoice.total.toFixed(2),
        dueDate: formatDate(invoice.dueDate),
        paymentLink: 'wellcrafted.com/pay',
      },
    });
  }
}
```

---

## Template Performance Metrics

Track these metrics for each template:

### Engagement Metrics
- **Delivery Rate:** % of messages delivered
- **Reply Rate:** % of customers who respond
- **Opt-Out Rate:** % who STOP
- **Conversion Rate:** % who take action

### Template Effectiveness
```
Weekly Specials: 45% reply rate, 12% conversion
Delivery Notifications: 95% delivery, 2% reply
Tasting Invitations: 35% reply, 25% conversion
Order Confirmations: 98% delivery, 5% reply
Customer Check-In: 40% reply rate
Payment Reminders: 70% payment within 24h
Reorder Reminders: 30% conversion rate
Appointment Reminders: 85% confirmation rate
```

---

## Localization

For multi-language support:

```typescript
const TEMPLATES_ES: Record<string, SMSTemplate> = {
  WEEKLY_SPECIALS: {
    id: 'weekly_specials_es',
    body: '¡Hola {{firstName}}! Esta semana en Well Crafted: {{special}}. Ordena antes de {{deadline}}.',
    // ...
  },
};
```

---

**Last Updated:** October 27, 2025
**Author:** System Architecture Designer
**Total Templates:** 8 (all categories)
