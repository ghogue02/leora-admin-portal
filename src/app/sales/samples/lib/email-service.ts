/**
 * Email service for sending sample follow-up emails
 * This integrates with your existing email infrastructure
 */

import {
  generateInitialFollowUpEmail,
  generateReminderEmail,
  generateFinalFollowUpEmail,
  generateOrderConfirmationEmail,
} from "../email-templates/sample-follow-up";

type EmailConfig = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * Send email using your email provider (SendGrid, SES, etc.)
 * This is a placeholder - integrate with your actual email service
 */
async function sendEmail(config: EmailConfig): Promise<boolean> {
  try {
    // TODO: Integrate with your email service
    // Example with SendGrid:
    // await sgMail.send(config);

    // For now, log the email
    console.log("Email would be sent:", {
      to: config.to,
      subject: config.subject,
      preview: config.text.substring(0, 100) + "...",
    });

    // You can also store in database for tracking
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

/**
 * Send initial follow-up email (1 week after sample)
 */
export async function sendInitialFollowUp(params: {
  customerEmail: string;
  customerName: string;
  productName: string;
  brand: string;
  sampleDate: Date;
  salesRepName: string;
  salesRepEmail: string;
  salesRepPhone?: string;
  customerResponse?: string;
}): Promise<boolean> {
  const emailContent = generateInitialFollowUpEmail({
    customerName: params.customerName,
    productName: params.productName,
    brand: params.brand,
    sampleDate: params.sampleDate,
    salesRepName: params.salesRepName,
    salesRepEmail: params.salesRepEmail,
    salesRepPhone: params.salesRepPhone,
    customerResponse: params.customerResponse,
  });

  return sendEmail({
    from: params.salesRepEmail,
    to: params.customerEmail,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });
}

/**
 * Send reminder email (2 weeks after sample, no response)
 */
export async function sendReminderFollowUp(params: {
  customerEmail: string;
  customerName: string;
  productName: string;
  brand: string;
  sampleDate: Date;
  salesRepName: string;
  salesRepEmail: string;
  salesRepPhone?: string;
}): Promise<boolean> {
  const emailContent = generateReminderEmail({
    customerName: params.customerName,
    productName: params.productName,
    brand: params.brand,
    sampleDate: params.sampleDate,
    salesRepName: params.salesRepName,
    salesRepEmail: params.salesRepEmail,
    salesRepPhone: params.salesRepPhone,
  });

  return sendEmail({
    from: params.salesRepEmail,
    to: params.customerEmail,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });
}

/**
 * Send final follow-up email (3 weeks after sample)
 */
export async function sendFinalFollowUp(params: {
  customerEmail: string;
  customerName: string;
  productName: string;
  brand: string;
  sampleDate: Date;
  salesRepName: string;
  salesRepEmail: string;
  salesRepPhone?: string;
}): Promise<boolean> {
  const emailContent = generateFinalFollowUpEmail({
    customerName: params.customerName,
    productName: params.productName,
    brand: params.brand,
    sampleDate: params.sampleDate,
    salesRepName: params.salesRepName,
    salesRepEmail: params.salesRepEmail,
    salesRepPhone: params.salesRepPhone,
  });

  return sendEmail({
    from: params.salesRepEmail,
    to: params.customerEmail,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });
}

/**
 * Send order confirmation when sample converts
 */
export async function sendOrderConfirmation(params: {
  customerEmail: string;
  customerName: string;
  productName: string;
  brand: string;
  sampleDate: Date;
  salesRepName: string;
  salesRepEmail: string;
  salesRepPhone?: string;
  orderNumber: string;
  orderTotal: number;
}): Promise<boolean> {
  const emailContent = generateOrderConfirmationEmail({
    customerName: params.customerName,
    productName: params.productName,
    brand: params.brand,
    sampleDate: params.sampleDate,
    salesRepName: params.salesRepName,
    salesRepEmail: params.salesRepEmail,
    salesRepPhone: params.salesRepPhone,
    orderNumber: params.orderNumber,
    orderTotal: params.orderTotal,
  });

  return sendEmail({
    from: params.salesRepEmail,
    to: params.customerEmail,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });
}

/**
 * Schedule automated follow-up emails for a sample
 */
export async function scheduleFollowUpSequence(params: {
  sampleId: string;
  customerEmail: string;
  customerName: string;
  productName: string;
  brand: string;
  sampleDate: Date;
  salesRepName: string;
  salesRepEmail: string;
  salesRepPhone?: string;
  customerResponse?: string;
}): Promise<void> {
  // TODO: Integrate with your job queue (Bull, BullMQ, etc.)
  // Schedule emails at specific intervals

  // Week 1: Initial follow-up
  // await scheduleJob({
  //   name: 'sample-initial-followup',
  //   data: params,
  //   runAt: addDays(params.sampleDate, 7),
  // });

  // Week 2: Reminder
  // await scheduleJob({
  //   name: 'sample-reminder',
  //   data: params,
  //   runAt: addDays(params.sampleDate, 14),
  // });

  // Week 3: Final follow-up
  // await scheduleJob({
  //   name: 'sample-final-followup',
  //   data: params,
  //   runAt: addDays(params.sampleDate, 21),
  // });

  console.log("Follow-up sequence scheduled for sample:", params.sampleId);
}
