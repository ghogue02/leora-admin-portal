#!/usr/bin/env tsx
/**
 * Email Setup Validation Script
 * Run: npx tsx scripts/email-setup-check.ts
 */

import * as dns from 'dns';
import * as util from 'util';

const resolveTxt = util.promisify(dns.resolveTxt);
const resolveCname = util.promisify(dns.resolveCname);

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const results: CheckResult[] = [];

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('EMAIL SETUP VALIDATION RESULTS');
  console.log('='.repeat(60) + '\n');

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  results.forEach((result) => {
    const icon =
      result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
    const color =
      result.status === 'pass'
        ? '\x1b[32m'
        : result.status === 'fail'
        ? '\x1b[31m'
        : '\x1b[33m';
    const reset = '\x1b[0m';

    console.log(`${color}${icon} ${result.name}${reset}`);
    console.log(`  ${result.message}\n`);

    if (result.status === 'pass') passCount++;
    else if (result.status === 'fail') failCount++;
    else warnCount++;
  });

  console.log('='.repeat(60));
  console.log(
    `Total: ${results.length} | Pass: ${passCount} | Fail: ${failCount} | Warnings: ${warnCount}`
  );
  console.log('='.repeat(60) + '\n');

  if (failCount > 0) {
    console.log(
      '\x1b[31mSome checks failed. Review the setup guide:\x1b[0m'
    );
    console.log('docs/EMAIL_SETUP_GUIDE.md\n');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log(
      '\x1b[33mAll critical checks passed, but there are warnings.\x1b[0m\n'
    );
  } else {
    console.log('\x1b[32m✓ All checks passed! Email setup is complete.\x1b[0m\n');
  }
}

async function checkEnvironmentVariables() {
  console.log('Checking environment variables...');

  // Check EMAIL_PROVIDER
  const provider = process.env.EMAIL_PROVIDER;
  if (!provider) {
    results.push({
      name: 'EMAIL_PROVIDER',
      status: 'warning',
      message: 'Not set. Defaulting to sendgrid.',
    });
  } else if (provider === 'sendgrid') {
    results.push({
      name: 'EMAIL_PROVIDER',
      status: 'pass',
      message: `Set to: ${provider}`,
    });
  } else {
    results.push({
      name: 'EMAIL_PROVIDER',
      status: 'warning',
      message: `Set to: ${provider}. This guide covers SendGrid setup.`,
    });
  }

  // Check SENDGRID_API_KEY
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    results.push({
      name: 'SENDGRID_API_KEY',
      status: 'fail',
      message: 'Not set. Add to .env.local file.',
    });
  } else if (!apiKey.startsWith('SG.')) {
    results.push({
      name: 'SENDGRID_API_KEY',
      status: 'fail',
      message: 'Invalid format. Should start with "SG."',
    });
  } else if (apiKey.length < 50) {
    results.push({
      name: 'SENDGRID_API_KEY',
      status: 'warning',
      message: 'Key seems too short. Verify it is correct.',
    });
  } else {
    results.push({
      name: 'SENDGRID_API_KEY',
      status: 'pass',
      message: `Set (${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)})`,
    });
  }

  // Check FROM_EMAIL
  const fromEmail = process.env.FROM_EMAIL;
  if (!fromEmail) {
    results.push({
      name: 'FROM_EMAIL',
      status: 'fail',
      message: 'Not set. Add to .env.local file.',
    });
  } else if (!fromEmail.includes('@')) {
    results.push({
      name: 'FROM_EMAIL',
      status: 'fail',
      message: 'Invalid email format.',
    });
  } else {
    results.push({
      name: 'FROM_EMAIL',
      status: 'pass',
      message: `Set to: ${fromEmail}`,
    });
  }

  // Check FROM_NAME
  const fromName = process.env.FROM_NAME;
  if (!fromName) {
    results.push({
      name: 'FROM_NAME',
      status: 'warning',
      message: 'Not set. Will use default name.',
    });
  } else {
    results.push({
      name: 'FROM_NAME',
      status: 'pass',
      message: `Set to: ${fromName}`,
    });
  }
}

async function checkDNSRecords() {
  console.log('Checking DNS records...');

  const domain = process.env.FROM_EMAIL?.split('@')[1] || 'wellcraftedbeverage.com';

  // Check SPF
  try {
    const records = await resolveTxt(domain);
    const spfRecord = records
      .flat()
      .find((r) => r.startsWith('v=spf1') && r.includes('sendgrid'));

    if (spfRecord) {
      results.push({
        name: 'SPF Record',
        status: 'pass',
        message: `Found: ${spfRecord.substring(0, 50)}...`,
      });
    } else {
      results.push({
        name: 'SPF Record',
        status: 'warning',
        message: 'Not found or does not include SendGrid. May affect deliverability.',
      });
    }
  } catch (error) {
    results.push({
      name: 'SPF Record',
      status: 'warning',
      message: 'Could not verify. Check DNS configuration manually.',
    });
  }

  // Check DKIM
  try {
    const dkimHost = `s1._domainkey.${domain}`;
    await resolveCname(dkimHost);
    results.push({
      name: 'DKIM Record',
      status: 'pass',
      message: 'DKIM CNAME record found.',
    });
  } catch (error) {
    results.push({
      name: 'DKIM Record',
      status: 'warning',
      message: 'DKIM record not found. Complete domain authentication in SendGrid.',
    });
  }

  // Check DMARC
  try {
    const dmarcHost = `_dmarc.${domain}`;
    const records = await resolveTxt(dmarcHost);
    const dmarcRecord = records.flat().find((r) => r.startsWith('v=DMARC1'));

    if (dmarcRecord) {
      results.push({
        name: 'DMARC Record',
        status: 'pass',
        message: 'DMARC record found.',
      });
    } else {
      results.push({
        name: 'DMARC Record',
        status: 'warning',
        message: 'DMARC record not found. Recommended for production.',
      });
    }
  } catch (error) {
    results.push({
      name: 'DMARC Record',
      status: 'warning',
      message: 'DMARC record not found. Recommended for production.',
    });
  }
}

async function checkDatabaseSchema() {
  console.log('Checking database schema...');

  try {
    const { prisma } = await import('../src/lib/prisma');

    // Check if EmailMessage table exists
    try {
      await prisma.emailMessage.findFirst({ take: 1 });
      results.push({
        name: 'EmailMessage Table',
        status: 'pass',
        message: 'Table exists and is accessible.',
      });
    } catch (error: any) {
      results.push({
        name: 'EmailMessage Table',
        status: 'fail',
        message: 'Table not found. Run database migrations.',
      });
    }

    // Check if EmailTemplate table exists
    try {
      await prisma.emailTemplate.findFirst({ take: 1 });
      results.push({
        name: 'EmailTemplate Table',
        status: 'pass',
        message: 'Table exists and is accessible.',
      });
    } catch (error: any) {
      results.push({
        name: 'EmailTemplate Table',
        status: 'fail',
        message: 'Table not found. Run database migrations.',
      });
    }

    await prisma.$disconnect();
  } catch (error: any) {
    results.push({
      name: 'Database Connection',
      status: 'fail',
      message: `Cannot connect to database: ${error.message}`,
    });
  }
}

async function checkPackages() {
  console.log('Checking installed packages...');

  try {
    await import('@sendgrid/mail');
    results.push({
      name: '@sendgrid/mail Package',
      status: 'pass',
      message: 'Package is installed.',
    });
  } catch (error) {
    results.push({
      name: '@sendgrid/mail Package',
      status: 'fail',
      message: 'Package not installed. Run: npm install @sendgrid/mail',
    });
  }
}

async function main() {
  console.log('\n📧 Email Setup Validation\n');
  console.log('This script checks your email configuration.\n');

  await checkEnvironmentVariables();
  await checkDNSRecords();
  await checkDatabaseSchema();
  await checkPackages();

  printResults();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
