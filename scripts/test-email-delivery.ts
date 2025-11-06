/**
 * Manual Email Delivery Test Script
 * Test email templates and sending functionality
 *
 * Usage:
 *   tsx scripts/test-email-delivery.ts send
 *   tsx scripts/test-email-delivery.ts queue
 *   tsx scripts/test-email-delivery.ts process
 *   tsx scripts/test-email-delivery.ts stats
 */

import { sendEmailWithResend, queueEmail, processPendingEmails, getEmailStats } from '../src/lib/email/resend-service';

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || 'well-crafted';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

async function testSendEmail() {
  console.log('\n📧 Testing direct email send...\n');

  const result = await sendEmailWithResend({
    to: TEST_EMAIL,
    subject: 'Test: Order Status Changed',
    templateName: 'orderStatusChanged',
    templateData: {
      orderId: 'test-order-123',
      orderNumber: 'WC-2024-TEST-001',
      customerName: 'Test Customer',
      previousStatus: 'SUBMITTED',
      newStatus: 'PICKED',
      orderDate: new Date().toLocaleDateString(),
      totalAmount: '1,250.00',
      baseUrl: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    },
    tenantId: TENANT_ID,
  });

  if (result.success) {
    console.log('✅ Email sent successfully!');
    console.log('   External ID:', result.externalId);
  } else {
    console.error('❌ Email send failed:', result.error);
  }
}

async function testQueueEmail() {
  console.log('\n📬 Testing email queuing...\n');

  const result = await queueEmail({
    to: TEST_EMAIL,
    subject: 'Test: Daily Summary (Scheduled)',
    templateName: 'dailySummary',
    templateData: {
      salesRepName: 'Test Sales Rep',
      date: new Date().toLocaleDateString(),
      metrics: {
        ordersCount: 5,
        ordersTotal: '5,000.00',
        newCustomers: 2,
        activitiesCompleted: 8,
        tasksCompleted: 3,
        tasksPending: 5,
      },
      topOrders: [
        {
          orderNumber: 'WC-2024-001',
          customerName: 'ABC Restaurant',
          totalAmount: '1,500.00',
        },
        {
          orderNumber: 'WC-2024-002',
          customerName: 'XYZ Bar',
          totalAmount: '1,200.00',
        },
      ],
      upcomingTasks: [
        {
          title: 'Follow up with ABC Restaurant',
          dueDate: 'Tomorrow',
          priority: 'HIGH',
        },
      ],
      baseUrl: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    },
    tenantId: TENANT_ID,
    scheduledFor: new Date(Date.now() + 60000), // 1 minute from now
  });

  if (result.success) {
    console.log('✅ Email queued successfully!');
    console.log('   Email ID:', result.emailId);
    console.log('   Will be sent in 1 minute');
  } else {
    console.error('❌ Email queue failed:', result.error);
  }
}

async function testProcessQueue() {
  console.log('\n⚙️  Processing email queue...\n');

  const result = await processPendingEmails();

  console.log('📊 Processing Results:');
  console.log(`   Total processed: ${result.processed}`);
  console.log(`   ✅ Sent: ${result.sent}`);
  console.log(`   ❌ Failed: ${result.failed}`);

  if (result.results.length > 0) {
    console.log('\n📝 Details:');
    result.results.forEach((r, i) => {
      const status = r.status === 'sent' ? '✅' : '❌';
      console.log(`   ${status} ${r.id}: ${r.status}${r.error ? ` (${r.error})` : ''}`);
    });
  }
}

async function testEmailStats() {
  console.log('\n📊 Fetching email statistics...\n');

  const stats = await getEmailStats(TENANT_ID);

  console.log('Email Statistics:');
  console.log(`   Total emails: ${stats.total}`);
  console.log(`   ✅ Sent: ${stats.sent}`);
  console.log(`   ⏳ Pending: ${stats.pending}`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  console.log(`   📖 Opened: ${stats.opened}`);
  console.log(`   🔗 Clicked: ${stats.clicked}`);

  if (stats.sent > 0) {
    const openRate = ((stats.opened / stats.sent) * 100).toFixed(2);
    const clickRate = ((stats.clicked / stats.sent) * 100).toFixed(2);
    console.log(`\n   📈 Open rate: ${openRate}%`);
    console.log(`   📈 Click rate: ${clickRate}%`);
  }
}

async function main() {
  const command = process.argv[2];

  // Check environment
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ Error: RESEND_API_KEY not configured');
    console.error('   Add it to your .env.local file');
    process.exit(1);
  }

  switch (command) {
    case 'send':
      await testSendEmail();
      break;

    case 'queue':
      await testQueueEmail();
      break;

    case 'process':
      await testProcessQueue();
      break;

    case 'stats':
      await testEmailStats();
      break;

    case 'all':
      await testSendEmail();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await testQueueEmail();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await testEmailStats();
      break;

    default:
      console.log('Email Delivery System Test Script');
      console.log('');
      console.log('Usage:');
      console.log('  tsx scripts/test-email-delivery.ts send     - Send test email immediately');
      console.log('  tsx scripts/test-email-delivery.ts queue    - Queue email for later');
      console.log('  tsx scripts/test-email-delivery.ts process  - Process pending emails');
      console.log('  tsx scripts/test-email-delivery.ts stats    - Show email statistics');
      console.log('  tsx scripts/test-email-delivery.ts all      - Run all tests');
      console.log('');
      console.log('Environment:');
      console.log(`  RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set'}`);
      console.log(`  TEST_EMAIL: ${TEST_EMAIL}`);
      console.log(`  TENANT_ID: ${TENANT_ID}`);
      process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
