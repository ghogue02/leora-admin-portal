/**
 * Order Notification System
 *
 * Email notifications for order events:
 * - Order requires approval (to manager)
 * - Order approved (to sales rep)
 * - Order rejected (to sales rep with reason)
 * - Reservation expired (to sales rep)
 *
 * Uses Resend API (configured in .env: RESEND_API_KEY)
 */

import { PrismaClient } from '@prisma/client';

type NotificationData = {
  tenantId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  orderId?: string;
  customerId?: string;
};

/**
 * Send email notification (stub - integrate with actual email service)
 */
async function sendEmail(data: NotificationData): Promise<boolean> {
  // TODO: Integrate with Resend, SendGrid, or other email service
  // For now, just log to console

  console.log('📧 [Email Notification]');
  console.log('  To:', data.recipientEmail);
  console.log('  Subject:', data.subject);
  console.log('  Body:', data.body);

  // Future implementation:
  /*
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'orders@wellcraftedwine.com',
      to: data.recipientEmail,
      subject: data.subject,
      html: data.body,
    });
  }
  */

  return true;
}

/**
 * Notify manager when order requires approval
 */
export async function notifyManagerOrderNeedsApproval(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string
): Promise<void> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: {
      customer: {
        select: {
          name: true,
          salesRepId: true,
          salesRep: {
            select: {
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      },
      lines: {
        include: {
          sku: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!order) return;

  // TODO: Get manager email(s) from database
  const managerEmail = 'manager@wellcraftedwine.com'; // Placeholder

  const subject = `Order Approval Needed - ${order.customer.name}`;

  const body = `
<h2>Order Requires Your Approval</h2>

<p>An order has been created that requires manager approval due to insufficient inventory.</p>

<h3>Order Details:</h3>
<ul>
  <li><strong>Order ID:</strong> ${order.id.slice(0, 8)}</li>
  <li><strong>Customer:</strong> ${order.customer.name}</li>
  <li><strong>Sales Rep:</strong> ${order.customer.salesRep?.user.fullName || 'Unknown'}</li>
  <li><strong>Delivery Date:</strong> ${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Not set'}</li>
  <li><strong>Total:</strong> $${Number(order.total || 0).toFixed(2)}</li>
</ul>

<h3>Line Items with Inventory Issues:</h3>
<ul>
${order.lines.map(line => `  <li>${line.sku.product.name} (${line.sku.code}) - Qty: ${line.quantity}</li>`).join('\n')}
</ul>

<p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sales/manager/approvals">Review and Approve →</a></p>
`;

  await sendEmail({
    tenantId,
    recipientEmail: managerEmail,
    subject,
    body,
    orderId,
    customerId: order.customerId,
  });
}

/**
 * Notify sales rep when order is approved
 */
export async function notifyRepOrderApproved(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string
): Promise<void> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: {
      customer: {
        select: {
          name: true,
          salesRep: {
            select: {
              user: {
                select: {
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order || !order.customer.salesRep) return;

  const salesRepEmail = order.customer.salesRep.user.email;

  const subject = `Order Approved - ${order.customer.name}`;

  const body = `
<h2>Your Order Has Been Approved</h2>

<p>Good news! The order you submitted for ${order.customer.name} has been approved by management.</p>

<h3>Order Details:</h3>
<ul>
  <li><strong>Order ID:</strong> ${order.id.slice(0, 8)}</li>
  <li><strong>Customer:</strong> ${order.customer.name}</li>
  <li><strong>Delivery Date:</strong> ${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Not set'}</li>
  <li><strong>Total:</strong> $${Number(order.total || 0).toFixed(2)}</li>
  <li><strong>Status:</strong> PENDING (Ready for you to mark as Ready to Deliver)</li>
</ul>

<p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sales/orders/${order.id}">View Order →</a></p>
`;

  await sendEmail({
    tenantId,
    recipientEmail: salesRepEmail,
    subject,
    body,
    orderId,
    customerId: order.customerId,
  });
}

/**
 * Notify sales rep when order is rejected
 */
export async function notifyRepOrderRejected(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
  reason: string
): Promise<void> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: {
      customer: {
        select: {
          name: true,
          salesRep: {
            select: {
              user: {
                select: {
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order || !order.customer.salesRep) return;

  const salesRepEmail = order.customer.salesRep.user.email;

  const subject = `Order Not Approved - ${order.customer.name}`;

  const body = `
<h2>Order Could Not Be Approved</h2>

<p>The order you submitted for ${order.customer.name} was reviewed by management and could not be approved at this time.</p>

<h3>Order Details:</h3>
<ul>
  <li><strong>Order ID:</strong> ${order.id.slice(0, 8)}</li>
  <li><strong>Customer:</strong> ${order.customer.name}</li>
  <li><strong>Total:</strong> $${Number(order.total || 0).toFixed(2)}</li>
  <li><strong>Status:</strong> CANCELLED</li>
</ul>

<h3>Reason:</h3>
<p>${reason}</p>

<p>Please contact your manager if you have questions or would like to submit a revised order.</p>
`;

  await sendEmail({
    tenantId,
    recipientEmail: salesRepEmail,
    subject,
    body,
    orderId,
    customerId: order.customerId,
  });
}

/**
 * Notify sales rep when reservation expires and order is auto-cancelled
 */
export async function notifyRepOrderExpired(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string
): Promise<void> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: {
      customer: {
        select: {
          name: true,
          salesRep: {
            select: {
              user: {
                select: {
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order || !order.customer.salesRep) return;

  const salesRepEmail = order.customer.salesRep.user.email;

  const subject = `Order Expired - ${order.customer.name}`;

  const body = `
<h2>Order Automatically Cancelled</h2>

<p>The order you created for ${order.customer.name} was not processed within 48 hours and has been automatically cancelled.</p>

<h3>Order Details:</h3>
<ul>
  <li><strong>Order ID:</strong> ${order.id.slice(0, 8)}</li>
  <li><strong>Customer:</strong> ${order.customer.name}</li>
  <li><strong>Created:</strong> ${order.createdAt.toLocaleDateString()}</li>
  <li><strong>Total:</strong> $${Number(order.total || 0).toFixed(2)}</li>
</ul>

<p>The inventory reservation has been released. If this order is still needed, please create a new order.</p>

<p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sales/orders/new">Create New Order →</a></p>
`;

  await sendEmail({
    tenantId,
    recipientEmail: salesRepEmail,
    subject,
    body,
    orderId,
    customerId: order.customerId,
  });
}
