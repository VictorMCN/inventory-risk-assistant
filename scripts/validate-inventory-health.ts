import "dotenv/config";

import { getInventoryHealthAnalytics } from "../src/lib/analytics/get-inventory-health-analytics";
import { getSkusFromDatabase } from "../src/lib/data/get-skus-from-database";
import { prisma } from "../src/lib/database/prisma";
import { calculateRisk } from "../src/lib/risk/calculate-risk";

const SNAPSHOT_DATE = new Date("2026-03-31T00:00:00Z");

function getDaysSinceLastSale(
  lastSaleDate: string | null,
): number | null {
  if (!lastSaleDate) {
    return null;
  }

  const saleDate = new Date(
    `${lastSaleDate}T00:00:00Z`,
  );

  return (
    (SNAPSHOT_DATE.getTime() - saleDate.getTime()) /
    (1000 * 60 * 60 * 24)
  );
}

async function main() {
  console.log("Validating inventory health analytics...");
  console.log("");

  const [analytics, skus] = await Promise.all([
    getInventoryHealthAnalytics(),
    getSkusFromDatabase(),
  ]);

  const staleSkus = skus.filter((sku) => {
    const daysSinceLastSale = getDaysSinceLastSale(
      sku.lastSaleDate,
    );

    return (
      daysSinceLastSale !== null &&
      daysSinceLastSale >= 60
    );
  });

  const expectedStaleCount = staleSkus.length;

  const expectedStaleInventoryValue = staleSkus.reduce(
    (total, sku) =>
      total + sku.currentStock * sku.unitCost,
    0,
  );

  const expectedHighMarginStale = staleSkus.filter(
    (sku) => sku.marginPct > 50,
  ).length;

  const expectedAtRisk = skus.filter((sku) => {
    const level = calculateRisk(sku).level;

    return (
      level === "High" ||
      level === "Critical"
    );
  }).length;

  const expectedCritical = skus.filter(
    (sku) => calculateRisk(sku).level === "Critical",
  ).length;

  const supplierSkuTotal = analytics.suppliers.reduce(
    (total, supplier) => total + supplier.totalSkus,
    0,
  );

  const supplierAtRiskTotal = analytics.suppliers.reduce(
    (total, supplier) => total + supplier.atRiskSkus,
    0,
  );

  const supplierCriticalTotal = analytics.suppliers.reduce(
    (total, supplier) =>
      total + supplier.criticalRiskSkus,
    0,
  );

  const staleValueDifference = Math.abs(
    analytics.staleInventory.inventoryValue -
      expectedStaleInventoryValue,
  );

  console.log("=== STALE INVENTORY ===");

  console.log(
    `Stale SKUs: JavaScript=${expectedStaleCount}, SQL=${analytics.staleInventory.staleSkus}`,
  );

  console.log(
    `Stale inventory value: JavaScript=${expectedStaleInventoryValue.toFixed(2)}, SQL=${analytics.staleInventory.inventoryValue.toFixed(2)}`,
  );

  console.log(
    `High-margin stale SKUs: JavaScript=${expectedHighMarginStale}, SQL=${analytics.staleInventory.highMarginStaleSkus}`,
  );

  console.log("");
  console.log("=== SUPPLIER RISK ===");

  console.log(
    `Suppliers: ${analytics.suppliers.length}`,
  );

  console.log(
    `Supplier SKU total: ${supplierSkuTotal}`,
  );

  console.log(
    `At-risk total: JavaScript=${expectedAtRisk}, SQL=${supplierAtRiskTotal}`,
  );

  console.log(
    `Critical total: JavaScript=${expectedCritical}, SQL=${supplierCriticalTotal}`,
  );

  console.log("");

  console.log("=== TOP SUPPLIERS BY AT-RISK SKUS ===");

  for (const supplier of analytics.suppliers.slice(0, 5)) {
    console.log(
      `${supplier.supplier}: ${supplier.atRiskSkus} at risk / ${supplier.totalSkus} total (${supplier.atRiskRatePct.toFixed(1)}%)`,
    );
  }

  const validationPassed =
    analytics.staleInventory.staleSkus ===
      expectedStaleCount &&
    staleValueDifference < 0.01 &&
    analytics.staleInventory.highMarginStaleSkus ===
      expectedHighMarginStale &&
    supplierSkuTotal === skus.length &&
    supplierAtRiskTotal === expectedAtRisk &&
    supplierCriticalTotal === expectedCritical;

  console.log("");
  console.log(
    `Stale inventory value difference: ${staleValueDifference}`,
  );

  if (!validationPassed) {
    throw new Error(
      "Inventory health analytics do not match the validated application logic.",
    );
  }

  console.log("");
  console.log("=== VALIDATION PASSED ===");

  console.log(
    "Inventory health and supplier-risk analytics are consistent with the existing risk engine.",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);

    await prisma.$disconnect();

    process.exit(1);
  });