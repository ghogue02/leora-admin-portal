import type { Prisma } from "@prisma/client";
import type {
  MinimumOrderPolicyClient as MinimumOrderPolicy,
  MinimumOrderPolicySource,
  OrderApprovalReason,
  OrderApprovalReasonCode,
} from "@/types/orders";

export type MinimumOrderEvaluation = {
  violation: boolean;
  shortfall: number;
  threshold: number;
};

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

function decimalToNumber(value: DecimalLike): number | null {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  try {
    return "toNumber" in value ? (value as Prisma.Decimal).toNumber() : Number(value);
  } catch {
    return null;
  }
}

export function buildMinimumOrderPolicy(args: {
  tenantSettings?: {
    minimumOrderAmount?: DecimalLike;
    minimumOrderEnforcementEnabled?: boolean | null;
  } | null;
  customer?: {
    minimumOrderOverride?: DecimalLike;
  } | null;
}): MinimumOrderPolicy {
  const tenantAmount = decimalToNumber(args.tenantSettings?.minimumOrderAmount) ?? 200;
  const overrideAmount = decimalToNumber(args.customer?.minimumOrderOverride);
  const enforcementEnabled = Boolean(args.tenantSettings?.minimumOrderEnforcementEnabled);

  if (overrideAmount !== null && overrideAmount > 0) {
    return {
      enforcementEnabled,
      tenantAmount,
      appliedAmount: overrideAmount,
      source: "customer",
      overrideAmount,
    };
  }

  return {
    enforcementEnabled,
    tenantAmount,
    appliedAmount: tenantAmount,
    source: "tenant",
    overrideAmount: null,
  };
}

export function evaluateMinimumOrder(
  policy: MinimumOrderPolicy,
  orderTotal: number,
): MinimumOrderEvaluation {
  if (!policy.enforcementEnabled || policy.appliedAmount <= 0) {
    return {
      violation: false,
      shortfall: 0,
      threshold: policy.appliedAmount,
    };
  }

  const violation = orderTotal < policy.appliedAmount;
  const shortfall = violation ? policy.appliedAmount - orderTotal : 0;

  return {
    violation,
    shortfall,
    threshold: policy.appliedAmount,
  };
}

export function addApprovalReason(
  reasons: OrderApprovalReason[],
  reason: OrderApprovalReason,
  existingCodes: Set<OrderApprovalReasonCode>,
): void {
  if (existingCodes.has(reason.code)) {
    return;
  }
  existingCodes.add(reason.code);
  reasons.push(reason);
}
