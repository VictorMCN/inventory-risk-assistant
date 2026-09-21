import { calculateRisk } from "@/lib/risk/calculate-risk";
import type { Sku } from "@/types/sku";

export type InventoryMetrics = {
  totalSkus: number;
  criticalRiskSkus: number;
  atRiskSkus: number;
  inventoryValue: number;
};

export function calculateInventoryMetrics(
  skus: Sku[],
): InventoryMetrics {
  const totalSkus = skus.length;

  const inventoryValue = skus.reduce(
    (total, sku) => total + sku.currentStock * sku.unitCost,
    0,
  );

  const riskAssessments = skus.map((sku) => calculateRisk(sku));

  const criticalRiskSkus = riskAssessments.filter(
    (assessment) => assessment.level === "Critical",
  ).length;

  const atRiskSkus = riskAssessments.filter(
    (assessment) =>
      assessment.level === "High" ||
      assessment.level === "Critical",
  ).length;

  return {
    totalSkus,
    criticalRiskSkus,
    atRiskSkus,
    inventoryValue,
  };
}