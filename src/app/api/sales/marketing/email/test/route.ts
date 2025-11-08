/**
 * Email Testing API
 * POST /api/sales/marketing/email/test - Send test email
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  sendEmailViaSendGrid,
  validateSendGridApiKey,
} from "@/lib/marketing/email-providers/sendgrid-provider";
import { replacePersonalizationTokens } from "@/lib/marketing/email-service";
import { getTemplateById, EMAIL_TEMPLATES } from "@/lib/marketing/email-templates-data";

const testRequestSchema = z.object({
  testType: z.enum(["validate-api-key", "send-test", "test-all-templates"]),
  to: z.string().email().optional(),
  templateId: z.string().optional(),
  personalization: z.record(z.string()).optional(),
});

const defaultPersonalization = () => ({
  customer_name: "Test Customer",
  week_date: new Date().toLocaleDateString(),
  special_wine_1: "2019 Napa Valley Cabernet Sauvignon",
  special_wine_2: "2020 Russian River Chardonnay",
  special_wine_3: "2021 Willamette Valley Pinot Noir",
  discount_percent: "15",
  order_link: "https://example.com/order",
  product_name: "Test Wine",
  product_description: "A wonderful test wine",
  tasting_notes: "Rich, bold, complex",
  price: "$49.99",
  order_number: "12345",
  order_date: new Date().toLocaleDateString(),
  order_total: "$299.97",
  delivery_date: "Tomorrow",
  items_ordered: "Test items",
  tracking_link: "https://example.com/track",
  event_name: "Test Tasting Event",
  event_date: "Next Friday",
  event_time: "6:00 PM - 8:00 PM",
  event_location: "123 Main Street",
  event_description: "Join us for a special tasting",
  rsvp_link: "https://example.com/rsvp",
  feedback_link: "https://example.com/feedback",
  reorder_link: "https://example.com/reorder",
});

export async function POST(request: NextRequest) {
  try {
    const { testType, to, templateId, personalization } = testRequestSchema.parse(
      await request.json()
    );

    // Test API key validation
    if (testType === 'validate-api-key') {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          error: 'SENDGRID_API_KEY not configured',
        });
      }

      const isValid = await validateSendGridApiKey(apiKey);
      return NextResponse.json({
        success: isValid,
        message: isValid
          ? 'SendGrid API key is valid'
          : 'SendGrid API key is invalid',
      });
    }

    // Send test email
    if (testType === 'send-test') {
      if (!to) {
        return NextResponse.json(
          { error: 'Email address "to" is required' },
          { status: 400 }
        );
      }

      let subject = "Test Email from Well Crafted CRM";
      let html = "<h1>Test Email</h1><p>This is a test email from your CRM system.</p>";

      // Use template if specified
      if (templateId) {
        const template = getTemplateById(templateId);
        if (!template) {
          return NextResponse.json(
            { error: "Template not found" },
            { status: 404 }
          );
        }

        const testPersonalization = personalization ?? defaultPersonalization();

        subject = replacePersonalizationTokens(template.subject, testPersonalization);
        html = replacePersonalizationTokens(template.html, testPersonalization);
      }

      const result = await sendEmailViaSendGrid({
        to,
        from: process.env.FROM_EMAIL || "noreply@example.com",
        fromName: process.env.FROM_NAME || "Well Crafted Wine & Beverage",
        subject,
        html,
      });

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId,
      });
    }

    // Test all templates
    if (testType === 'test-all-templates') {
      if (!to) {
        return NextResponse.json(
          { error: 'Email address "to" is required' },
          { status: 400 }
        );
      }

      const results: Array<Record<string, unknown>> = [];

      for (const template of EMAIL_TEMPLATES) {
        try {
          const testPersonalization = personalization ?? defaultPersonalization();

          const subject = replacePersonalizationTokens(template.subject, testPersonalization);
          const html = replacePersonalizationTokens(template.html, testPersonalization);

          const result = await sendEmailViaSendGrid({
            to,
            from: process.env.FROM_EMAIL || "noreply@example.com",
            fromName: process.env.FROM_NAME || "Well Crafted Wine & Beverage",
            subject: `[TEST] ${subject}`,
            html,
          });

          results.push({
            templateId: template.id,
            templateName: template.name,
            success: result.success,
            messageId: result.messageId,
            error: result.error,
          });

          // Wait 100ms between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          results.push({
            templateId: template.id,
            templateName: template.name,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return NextResponse.json({
        success: true,
        results,
        total: results.length,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      });
    }

    return NextResponse.json(
      { error: "Invalid testType. Use: validate-api-key, send-test, or test-all-templates" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Email test error:", error);
    const message = error instanceof Error ? error.message : "Failed to run email test";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
