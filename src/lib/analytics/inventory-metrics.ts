import type { Sku } from "@/types/sku";

export type InventoryMetrics = {
  totalSkus: number;
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

  return {
    totalSkus,
    inventoryValue,
  };
}