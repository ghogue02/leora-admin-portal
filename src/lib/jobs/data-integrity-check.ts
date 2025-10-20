import { PrismaClient } from '@prisma/client';
import { runAllValidationRules, type ValidationResult } from '../validation/rules';

const prisma = new PrismaClient();

export type IntegrityCheckResult = {
  tenantId: string;
  totalIssues: number;
  criticalIssues: number;
  qualityScore: number;
  issuesByRule: Record<string, number>;
  results: ValidationResult[];
  timestamp: Date;
};

/**
 * Calculate data quality score based on issues found
 * Formula: 100 - (issues / total_records * weight)
 */
function calculateQualityScore(
  results: ValidationResult[],
  totalRecords: number
): number {
  const totalIssues = results.reduce((sum, r) => sum + r.issueCount, 0);

  if (totalRecords === 0) return 100;

  // Weight factor: how much each issue impacts the score
  const impactFactor = 50;
  const rawScore = 100 - ((totalIssues / totalRecords) * impactFactor);

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, rawScore));
}

/**
 * Count critical issues (high severity)
 */
function countCriticalIssues(results: ValidationResult[]): number {
  // Import rules to check severity
  const { allValidationRules } = require('../validation/rules');

  return results.reduce((sum, result) => {
    const rule = allValidationRules.find((r: any) => r.id === result.ruleId);
    if (rule && rule.severity === 'high') {
      return sum + result.issueCount;
    }
    return sum;
  }, 0);
}

/**
 * Run data integrity check for a specific tenant
 */
export async function runDataIntegrityCheck(
  tenantId: string
): Promise<IntegrityCheckResult> {
  console.log(`[DataIntegrity] Running integrity check for tenant: ${tenantId}`);

  // Run all validation rules
  const results = await runAllValidationRules(prisma, tenantId);

  // Calculate metrics
  const totalIssues = results.reduce((sum, r) => sum + r.issueCount, 0);
  const criticalIssues = countCriticalIssues(results);

  // Get approximate total record count for quality score
  const [customerCount, orderCount, invoiceCount, userCount] = await Promise.all([
    prisma.customer.count({ where: { tenantId } }),
    prisma.order.count({ where: { tenantId } }),
    prisma.invoice.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId } }),
  ]);

  const totalRecords = customerCount + orderCount + invoiceCount + userCount;
  const qualityScore = calculateQualityScore(results, totalRecords);

  // Create issue count map
  const issuesByRule: Record<string, number> = {};
  results.forEach(result => {
    issuesByRule[result.ruleId] = result.issueCount;
  });

  const checkResult: IntegrityCheckResult = {
    tenantId,
    totalIssues,
    criticalIssues,
    qualityScore,
    issuesByRule,
    results,
    timestamp: new Date(),
  };

  console.log(`[DataIntegrity] Check complete. Quality Score: ${qualityScore.toFixed(2)}%`);
  console.log(`[DataIntegrity] Total Issues: ${totalIssues} (${criticalIssues} critical)`);

  return checkResult;
}

/**
 * Save integrity check results as a snapshot
 */
export async function saveIntegritySnapshot(
  result: IntegrityCheckResult
): Promise<void> {
  await prisma.dataIntegritySnapshot.create({
    data: {
      tenantId: result.tenantId,
      snapshotDate: result.timestamp,
      totalIssues: result.totalIssues,
      criticalIssues: result.criticalIssues,
      qualityScore: result.qualityScore,
      issuesByRule: result.issuesByRule,
    },
  });

  console.log(`[DataIntegrity] Snapshot saved for tenant: ${result.tenantId}`);
}

/**
 * Run integrity check and save snapshot
 */
export async function runAndSaveIntegrityCheck(
  tenantId: string
): Promise<IntegrityCheckResult> {
  const result = await runDataIntegrityCheck(tenantId);
  await saveIntegritySnapshot(result);
  return result;
}

/**
 * Get historical integrity snapshots
 */
export async function getIntegrityHistory(
  tenantId: string,
  days: number = 30
): Promise<any[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await prisma.dataIntegritySnapshot.findMany({
    where: {
      tenantId,
      snapshotDate: {
        gte: startDate,
      },
    },
    orderBy: {
      snapshotDate: 'asc',
    },
    select: {
      id: true,
      snapshotDate: true,
      totalIssues: true,
      criticalIssues: true,
      qualityScore: true,
      issuesByRule: true,
    },
  });
}

/**
 * Get latest snapshot for a tenant
 */
export async function getLatestSnapshot(tenantId: string) {
  return await prisma.dataIntegritySnapshot.findFirst({
    where: { tenantId },
    orderBy: { snapshotDate: 'desc' },
  });
}

/**
 * Send alerts if critical issues found
 * (Placeholder for future email/notification integration)
 */
export async function sendCriticalIssueAlerts(
  result: IntegrityCheckResult
): Promise<void> {
  if (result.criticalIssues === 0) return;

  console.log(`[DataIntegrity] ALERT: ${result.criticalIssues} critical issues found`);
  console.log('[DataIntegrity] Email alerts not yet implemented');

  // TODO: Integrate with email service
  // - Send email to admins
  // - Include summary of critical issues
  // - Provide link to data integrity dashboard
}

/**
 * Scheduled job to run nightly integrity checks
 * This can be called from a cron job or scheduler
 */
export async function scheduledIntegrityCheck(): Promise<void> {
  console.log('[DataIntegrity] Starting scheduled integrity check...');

  try {
    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    console.log(`[DataIntegrity] Found ${tenants.length} tenants to check`);

    // Run checks for each tenant
    for (const tenant of tenants) {
      try {
        const result = await runAndSaveIntegrityCheck(tenant.id);

        // Send alerts if critical issues found
        await sendCriticalIssueAlerts(result);
      } catch (error) {
        console.error(`[DataIntegrity] Error checking tenant ${tenant.name}:`, error);
      }
    }

    console.log('[DataIntegrity] Scheduled check complete');
  } catch (error) {
    console.error('[DataIntegrity] Scheduled check failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for CLI usage
if (require.main === module) {
  scheduledIntegrityCheck()
    .then(() => {
      console.log('Integrity check job completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Integrity check job failed:', error);
      process.exit(1);
    });
}
