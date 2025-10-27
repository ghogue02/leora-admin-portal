/**
 * Email templates for sample follow-ups
 */

type SampleFollowUpData = {
  customerName: string;
  productName: string;
  brand: string;
  sampleDate: Date;
  salesRepName: string;
  salesRepEmail: string;
  salesRepPhone?: string;
  customerResponse?: string;
};

/**
 * Initial follow-up email (1 week after sample)
 */
export function generateInitialFollowUpEmail(data: SampleFollowUpData): {
  subject: string;
  text: string;
  html: string;
} {
  const daysAgo = Math.floor(
    (new Date().getTime() - data.sampleDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const subject = `Following up: ${data.brand} ${data.productName} sample`;

  const text = `Hi ${data.customerName},

I hope you're doing well! I wanted to follow up regarding the ${data.brand} ${data.productName} sample I provided about ${daysAgo} days ago.

${data.customerResponse ? `When we last spoke, you mentioned: "${data.customerResponse}"\n\n` : ""}I'd love to hear your thoughts:
- What did you think of the product?
- Does it fit well with your current offerings?
- Would you like to discuss placing an order?

I'm here to answer any questions you might have and can provide additional samples or product information if helpful.

Looking forward to hearing from you!

Best regards,
${data.salesRepName}
${data.salesRepEmail}
${data.salesRepPhone || ""}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af;">Following up on your sample</h2>

      <p>Hi ${data.customerName},</p>

      <p>I hope you're doing well! I wanted to follow up regarding the <strong>${data.brand} ${data.productName}</strong> sample I provided about <strong>${daysAgo} days ago</strong>.</p>

      ${
        data.customerResponse
          ? `<div style="background: #f3f4f6; padding: 15px; border-left: 4px solid #1e40af; margin: 20px 0;">
          <p style="margin: 0; font-style: italic;">"${data.customerResponse}"</p>
        </div>`
          : ""
      }

      <p>I'd love to hear your thoughts:</p>
      <ul>
        <li>What did you think of the product?</li>
        <li>Does it fit well with your current offerings?</li>
        <li>Would you like to discuss placing an order?</li>
      </ul>

      <p>I'm here to answer any questions you might have and can provide additional samples or product information if helpful.</p>

      <p>Looking forward to hearing from you!</p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 5px 0;"><strong>${data.salesRepName}</strong></p>
        <p style="margin: 5px 0; color: #6b7280;">${data.salesRepEmail}</p>
        ${data.salesRepPhone ? `<p style="margin: 5px 0; color: #6b7280;">${data.salesRepPhone}</p>` : ""}
      </div>
    </div>
  `;

  return { subject, text, html };
}

/**
 * Reminder email (2 weeks after sample, no response)
 */
export function generateReminderEmail(data: SampleFollowUpData): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Quick check-in: ${data.brand} ${data.productName}`;

  const text = `Hi ${data.customerName},

I wanted to quickly check in about the ${data.brand} ${data.productName} sample from a couple weeks ago.

I understand you're busy, so just a quick question: Is this something you'd like to pursue, or should I check back at a different time?

Either way is fine - I just want to make sure I'm following up at a pace that works for you.

Feel free to reply when you have a moment, or give me a call if that's easier.

Thanks!
${data.salesRepName}
${data.salesRepEmail}
${data.salesRepPhone || ""}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">Quick check-in</h2>

      <p>Hi ${data.customerName},</p>

      <p>I wanted to quickly check in about the <strong>${data.brand} ${data.productName}</strong> sample from a couple weeks ago.</p>

      <p>I understand you're busy, so just a quick question: <strong>Is this something you'd like to pursue, or should I check back at a different time?</strong></p>

      <p>Either way is fine - I just want to make sure I'm following up at a pace that works for you.</p>

      <p>Feel free to reply when you have a moment, or give me a call if that's easier.</p>

      <p>Thanks!</p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 5px 0;"><strong>${data.salesRepName}</strong></p>
        <p style="margin: 5px 0; color: #6b7280;">${data.salesRepEmail}</p>
        ${data.salesRepPhone ? `<p style="margin: 5px 0; color: #6b7280;">${data.salesRepPhone}</p>` : ""}
      </div>
    </div>
  `;

  return { subject, text, html };
}

/**
 * Final follow-up email (3 weeks after sample)
 */
export function generateFinalFollowUpEmail(data: SampleFollowUpData): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Last check on ${data.brand} ${data.productName}`;

  const text = `Hi ${data.customerName},

I hope this finds you well. I wanted to reach out one last time about the ${data.brand} ${data.productName} sample.

If now isn't the right time, that's completely fine! I'll make a note to check back with you in a few months.

However, if you do have any questions or would like to place an order, I'm here and happy to help.

Either way, I appreciate your time and look forward to working with you.

All the best,
${data.salesRepName}
${data.salesRepEmail}
${data.salesRepPhone || ""}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Last check-in</h2>

      <p>Hi ${data.customerName},</p>

      <p>I hope this finds you well. I wanted to reach out one last time about the <strong>${data.brand} ${data.productName}</strong> sample.</p>

      <p>If now isn't the right time, that's completely fine! I'll make a note to check back with you in a few months.</p>

      <p>However, if you do have any questions or would like to place an order, I'm here and happy to help.</p>

      <p>Either way, I appreciate your time and look forward to working with you.</p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 5px 0;"><strong>${data.salesRepName}</strong></p>
        <p style="margin: 5px 0; color: #6b7280;">${data.salesRepEmail}</p>
        ${data.salesRepPhone ? `<p style="margin: 5px 0; color: #6b7280;">${data.salesRepPhone}</p>` : ""}
      </div>
    </div>
  `;

  return { subject, text, html };
}

/**
 * Order confirmation email (when sample converts to order)
 */
export function generateOrderConfirmationEmail(
  data: SampleFollowUpData & { orderNumber: string; orderTotal: number }
): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Thank you for your order! #${data.orderNumber}`;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const text = `Hi ${data.customerName},

Thank you so much for your order! I'm thrilled that you decided to go with ${data.brand} ${data.productName}.

Order #${data.orderNumber}
Total: ${formatCurrency(data.orderTotal)}

Your order is being processed and I'll keep you updated on the delivery timeline.

If you have any questions or need anything else, please don't hesitate to reach out.

Thanks again for your business!

Best regards,
${data.salesRepName}
${data.salesRepEmail}
${data.salesRepPhone || ""}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">Thank you for your order!</h2>

      <p>Hi ${data.customerName},</p>

      <p>Thank you so much for your order! I'm thrilled that you decided to go with <strong>${data.brand} ${data.productName}</strong>.</p>

      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Order #${data.orderNumber}</strong></p>
        <p style="margin: 5px 0; font-size: 24px; color: #059669;">${formatCurrency(data.orderTotal)}</p>
      </div>

      <p>Your order is being processed and I'll keep you updated on the delivery timeline.</p>

      <p>If you have any questions or need anything else, please don't hesitate to reach out.</p>

      <p><strong>Thanks again for your business!</strong></p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 5px 0;"><strong>${data.salesRepName}</strong></p>
        <p style="margin: 5px 0; color: #6b7280;">${data.salesRepEmail}</p>
        ${data.salesRepPhone ? `<p style="margin: 5px 0; color: #6b7280;">${data.salesRepPhone}</p>` : ""}
      </div>
    </div>
  `;

  return { subject, text, html };
}
