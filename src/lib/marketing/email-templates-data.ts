/**
 * Professional Email Templates Library
 * Ready-to-use email templates for Well Crafted Wine & Beverage
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: 'marketing' | 'transactional' | 'follow-up' | 'announcement';
  description: string;
  html: string;
  tokens: string[];
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'weekly-specials',
    name: 'Weekly Specials',
    subject: 'This Week\'s Featured Wines - {{week_date}}',
    category: 'marketing',
    description: 'Weekly promotional email highlighting featured wines and special offers',
    tokens: ['customer_name', 'week_date', 'special_wine_1', 'special_wine_2', 'special_wine_3', 'discount_percent', 'order_link'],
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Specials</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">
                Well Crafted Wine & Beverage
              </h1>
              <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 16px;">
                This Week's Featured Selections
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0;">
                Hello {{customer_name}},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 15px 0 0 0;">
                We're excited to share this week's exceptional wine selections, handpicked just for you!
              </p>
            </td>
          </tr>

          <!-- Featured Wine 1 -->
          <tr>
            <td style="padding: 20px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #7c3aed; margin: 0 0 10px 0; font-size: 20px;">
                      Featured Selection #1
                    </h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0;">
                      {{special_wine_1}}
                    </p>
                    <p style="color: #7c3aed; font-size: 18px; font-weight: bold; margin: 10px 0 0 0;">
                      Save {{discount_percent}}% this week!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Featured Wine 2 -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #7c3aed; margin: 0 0 10px 0; font-size: 20px;">
                      Featured Selection #2
                    </h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0;">
                      {{special_wine_2}}
                    </p>
                    <p style="color: #7c3aed; font-size: 18px; font-weight: bold; margin: 10px 0 0 0;">
                      Save {{discount_percent}}% this week!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Featured Wine 3 -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #7c3aed; margin: 0 0 10px 0; font-size: 20px;">
                      Featured Selection #3
                    </h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0;">
                      {{special_wine_3}}
                    </p>
                    <p style="color: #7c3aed; font-size: 18px; font-weight: bold; margin: 10px 0 0 0;">
                      Save {{discount_percent}}% this week!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 20px 30px 30px 30px; text-align: center;">
              <a href="{{order_link}}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                Order Now
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0;">
                Questions? Contact your sales representative or call us at (555) 123-4567
              </p>
              <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 15px 0 0 0;">
                © 2025 Well Crafted Wine & Beverage. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  },

  {
    id: 'new-product-announcement',
    name: 'New Product Announcement',
    subject: 'Exciting New Arrival: {{product_name}}',
    category: 'announcement',
    description: 'Announce new wine arrivals to customers',
    tokens: ['customer_name', 'product_name', 'product_description', 'tasting_notes', 'price', 'order_link'],
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Product Announcement</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                🍷 New Arrival 🍷
              </h1>
              <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">
                Just in from our wine expert!
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Dear {{customer_name}},
              </p>

              <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 24px;">
                {{product_name}}
              </h2>

              <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                {{product_description}}
              </p>

              <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 20px; margin: 0 0 20px 0;">
                <h3 style="color: #047857; margin: 0 0 10px 0; font-size: 18px;">
                  Tasting Notes
                </h3>
                <p style="color: #4b5563; font-size: 15px; line-height: 22px; margin: 0;">
                  {{tasting_notes}}
                </p>
              </div>

              <p style="color: #059669; font-size: 24px; font-weight: bold; margin: 0 0 25px 0;">
                Special Launch Price: {{price}}
              </p>

              <div style="text-align: center;">
                <a href="{{order_link}}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                  Order Now
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0;">
                Well Crafted Wine & Beverage<br>
                Quality wines, delivered with care
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  },

  {
    id: 'customer-check-in',
    name: 'Customer Check-in',
    subject: 'How are you enjoying your recent order?',
    category: 'follow-up',
    description: 'Follow up with customers after a purchase',
    tokens: ['customer_name', 'order_number', 'order_date', 'products_ordered', 'feedback_link', 'reorder_link'],
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Check-in</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                We Hope You're Enjoying Your Wine!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Hi {{customer_name}},
              </p>

              <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Thank you for your recent order <strong>#{{order_number}}</strong> on {{order_date}}. We wanted to check in and see how you're enjoying your wine!
              </p>

              <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 0 0 25px 0;">
                <h3 style="color: #dc2626; margin: 0 0 10px 0; font-size: 18px;">
                  Your Recent Purchase
                </h3>
                <p style="color: #4b5563; font-size: 15px; line-height: 22px; margin: 0;">
                  {{products_ordered}}
                </p>
              </div>

              <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 25px 0;">
                We'd love to hear your thoughts! Your feedback helps us serve you better.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 0 10px 0 0;" width="50%">
                    <a href="{{feedback_link}}" style="display: block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 6px; font-size: 15px; font-weight: bold; text-align: center;">
                      Share Feedback
                    </a>
                  </td>
                  <td style="padding: 0 0 0 10px;" width="50%">
                    <a href="{{reorder_link}}" style="display: block; background-color: #ffffff; color: #dc2626; text-decoration: none; padding: 14px 20px; border-radius: 6px; font-size: 15px; font-weight: bold; text-align: center; border: 2px solid #dc2626;">
                      Reorder
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0;">
                Questions or concerns? We're here to help!<br>
                Contact us at sales@wellcraftedbeverage.com or (555) 123-4567
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  },

  {
    id: 'tasting-invitation',
    name: 'Wine Tasting Invitation',
    subject: 'You\'re Invited: {{event_name}}',
    category: 'announcement',
    description: 'Invite customers to wine tasting events',
    tokens: ['customer_name', 'event_name', 'event_date', 'event_time', 'event_location', 'event_description', 'rsvp_link'],
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tasting Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #d97706 0%, #92400e 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">
                You're Invited!
              </h1>
              <p style="color: #fed7aa; margin: 10px 0 0 0; font-size: 18px;">
                🥂 Special Wine Tasting Event 🥂
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Dear {{customer_name}},
              </p>

              <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 25px 0;">
                We're thrilled to invite you to an exclusive wine tasting experience!
              </p>

              <div style="background-color: #fefce8; border: 2px solid #d97706; border-radius: 8px; padding: 25px; margin: 0 0 25px 0;">
                <h2 style="color: #d97706; margin: 0 0 15px 0; font-size: 24px; text-align: center;">
                  {{event_name}}
                </h2>

                <table width="100%" cellpadding="8" cellspacing="0" border="0">
                  <tr>
                    <td style="color: #92400e; font-weight: bold; font-size: 15px;" width="30%">📅 Date:</td>
                    <td style="color: #4b5563; font-size: 15px;">{{event_date}}</td>
                  </tr>
                  <tr>
                    <td style="color: #92400e; font-weight: bold; font-size: 15px;">🕒 Time:</td>
                    <td style="color: #4b5563; font-size: 15px;">{{event_time}}</td>
                  </tr>
                  <tr>
                    <td style="color: #92400e; font-weight: bold; font-size: 15px;">📍 Location:</td>
                    <td style="color: #4b5563; font-size: 15px;">{{event_location}}</td>
                  </tr>
                </table>
              </div>

              <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 25px 0;">
                {{event_description}}
              </p>

              <div style="text-align: center; margin: 0 0 20px 0;">
                <a href="{{rsvp_link}}" style="display: inline-block; background-color: #d97706; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 18px; font-weight: bold;">
                  RSVP Now
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0; text-align: center;">
                Spaces are limited - reserve your spot today!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0;">
                Well Crafted Wine & Beverage<br>
                Creating memorable wine experiences
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  },

  {
    id: 'thank-you-order',
    name: 'Thank You for Your Order',
    subject: 'Thank you for your order #{{order_number}}',
    category: 'transactional',
    description: 'Order confirmation and thank you message',
    tokens: ['customer_name', 'order_number', 'order_date', 'order_total', 'delivery_date', 'items_ordered', 'tracking_link'],
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">
                ✓ Order Confirmed!
              </h1>
              <p style="color: #dbeafe; margin: 10px 0 0 0; font-size: 16px;">
                Thank you for your purchase
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 18px; line-height: 26px; margin: 0 0 20px 0;">
                Hi {{customer_name}},
              </p>

              <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 25px 0;">
                Thank you for your order! We've received your purchase and are preparing it for delivery.
              </p>

              <!-- Order Details -->
              <div style="background-color: #eff6ff; border-radius: 8px; padding: 25px; margin: 0 0 25px 0;">
                <h2 style="color: #2563eb; margin: 0 0 15px 0; font-size: 20px;">
                  Order Summary
                </h2>

                <table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin: 0 0 15px 0;">
                  <tr>
                    <td style="color: #1e40af; font-weight: bold; font-size: 15px;" width="40%">Order Number:</td>
                    <td style="color: #4b5563; font-size: 15px;">#{{order_number}}</td>
                  </tr>
                  <tr>
                    <td style="color: #1e40af; font-weight: bold; font-size: 15px;">Order Date:</td>
                    <td style="color: #4b5563; font-size: 15px;">{{order_date}}</td>
                  </tr>
                  <tr>
                    <td style="color: #1e40af; font-weight: bold; font-size: 15px;">Expected Delivery:</td>
                    <td style="color: #4b5563; font-size: 15px;">{{delivery_date}}</td>
                  </tr>
                  <tr>
                    <td style="color: #1e40af; font-weight: bold; font-size: 15px;">Order Total:</td>
                    <td style="color: #4b5563; font-size: 18px; font-weight: bold;">{{order_total}}</td>
                  </tr>
                </table>

                <h3 style="color: #2563eb; margin: 20px 0 10px 0; font-size: 18px;">
                  Items Ordered
                </h3>
                <p style="color: #4b5563; font-size: 15px; line-height: 22px; margin: 0;">
                  {{items_ordered}}
                </p>
              </div>

              <div style="text-align: center; margin: 0 0 20px 0;">
                <a href="{{tracking_link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                  Track Your Order
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0; text-align: center;">
                You'll receive a shipping confirmation email once your order is on its way.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0 0 10px 0;">
                Questions about your order?<br>
                Contact us at sales@wellcraftedbeverage.com or (555) 123-4567
              </p>
              <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 0;">
                © 2025 Well Crafted Wine & Beverage. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  },
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: EmailTemplate['category']): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all template categories
 */
export function getAllCategories(): EmailTemplate['category'][] {
  return ['marketing', 'transactional', 'follow-up', 'announcement'];
}
