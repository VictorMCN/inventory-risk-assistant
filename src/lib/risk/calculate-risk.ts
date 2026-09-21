import type { RiskAssessment, RiskLevel } from "@/types/risk";
import type { Sku } from "@/types/sku";

const SNAPSHOT_DATE = new Date("2026-03-31T00:00:00Z");

function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) {
    return "Critical";
  }

  if (score >= 40) {
    return "High";
  }

  if (score >= 20) {
    return "Medium";
  }

  return "Low";
}

function getDaysSinceLastSale(lastSaleDate: string | null): number | null {
  if (!lastSaleDate) {
    return null;
  }

  const saleDate = new Date(`${lastSaleDate}T00:00:00Z`);

  return (
    (SNAPSHOT_DATE.getTime() - saleDate.getTime()) /
    (1000 * 60 * 60 * 24)
  );
}

export function calculateRisk(sku: Sku): RiskAssessment {
  const reasons: string[] = [];
  const healthFlags: RiskAssessment["healthFlags"] = [];

  let score = 0;

  const hasRecentDemand = sku.dailySales30dAvg > 0;

  const coverageDays = hasRecentDemand
    ? sku.currentStock / sku.dailySales30dAvg
    : null;

  const coverageRatio =
    coverageDays !== null && sku.leadTimeDays > 0
      ? coverageDays / sku.leadTimeDays
      : null;

  const immediateStockout =
    sku.currentStock === 0 && hasRecentDemand;

  if (immediateStockout) {
    reasons.push("Active demand with zero inventory");
  } else if (coverageRatio !== null && coverageRatio < 0.5) {
    score += 50;
    reasons.push("Coverage is below 50% of supplier lead time");
  } else if (coverageRatio !== null && coverageRatio < 1) {
    score += 40;
    reasons.push("Coverage is below supplier lead time");
  }

  if (sku.stockoutDaysLast90d > 10) {
    score += 20;
    reasons.push("More than 10 stockout days in the last 90 days");
  } else if (sku.stockoutDaysLast90d > 0) {
    score += 10;
    reasons.push("Recent stockout history");
  }

  if (sku.dailySales30dAvg > sku.dailySales90dAvg * 1.2) {
    score += 10;
    reasons.push("Recent demand increased by more than 20%");
  }

  if (sku.seasonalIndex > 1.2) {
    score += 5;
    reasons.push("Seasonal demand is above normal");
  }

  if (immediateStockout) {
    score = 100;
  } else {
    score = Math.min(score, 100);
  }

  const daysSinceLastSale = getDaysSinceLastSale(sku.lastSaleDate);

  if (daysSinceLastSale !== null && daysSinceLastSale >= 60) {
    healthFlags.push("STALE_INVENTORY");
  }

  return {
    score,
    level: getRiskLevel(score),
    coverageDays,
    coverageRatio,
    reasons,
    healthFlags,
  };
}