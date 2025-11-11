import type { CustomerReportRow } from "@/types/sales-dashboard";

const normalizeAccountType = (row: CustomerReportRow) => row.accountType?.toUpperCase() ?? null;

export const isActiveAccount = (row: CustomerReportRow) => normalizeAccountType(row) === "ACTIVE";
export const isTargetAccount = (row: CustomerReportRow) => normalizeAccountType(row) === "TARGET";
export const isProspectAccount = (row: CustomerReportRow) => normalizeAccountType(row) === "PROSPECT";
export const isKeyAccount = (row: CustomerReportRow) => isActiveAccount(row) || isTargetAccount(row);

export const hasRecentOrder = (row: CustomerReportRow, days = 45) =>
  row.daysSinceLastOrder !== null && row.daysSinceLastOrder <= days;

export const needsAttention = (row: CustomerReportRow, days = 45) =>
  row.daysSinceLastOrder === null || row.daysSinceLastOrder > days;

export const isMinimallyServiced = (row: CustomerReportRow) =>
  isActiveAccount(row) && (row.daysSinceLastActivity === null || row.daysSinceLastActivity > 30);

export const isColdLead = (row: CustomerReportRow) =>
  isTargetAccount(row) && (row.daysSinceLastActivity === null || row.daysSinceLastActivity > 60);

export const isDormantToCold = (row: CustomerReportRow) =>
  row.classification === "DORMANT" &&
  (row.daysSinceLastOrder === null || row.daysSinceLastOrder > 365) &&
  (row.daysSinceLastActivity === null || row.daysSinceLastActivity > 365);

export const filterBucket = (
  rows: CustomerReportRow[],
  predicate: (row: CustomerReportRow) => boolean,
) => rows.filter(predicate);
