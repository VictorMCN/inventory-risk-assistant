import "dotenv/config";

import { calculateInventoryMetrics } from "../src/lib/analytics/inventory-metrics";
import { getDashboardMetrics } from "../src/lib/analytics/get-dashboard-metrics";
import { getSkusFromDatabase } from "../src/lib/data/get-skus-from-database";
import { prisma } from "../src/lib/database/prisma";

async function main() {
  console.log("Validating database-powered dashboard metrics...");
  console.log("");

  const skus = await getSkusFromDatabase();

  const javascriptMetrics = calculateInventoryMetrics(skus);
  const databaseMetrics = await getDashboardMetrics();

  console.log("=== DASHBOARD METRICS ===");
  console.log(
    `Total SKUs: JavaScript=${javascriptMetrics.totalSkus}, SQL=${databaseMetrics.totalSkus}`,
  );
  console.log(
    `Critical Risk: JavaScript=${javascriptMetrics.criticalRiskSkus}, SQL=${databaseMetrics.criticalRiskSkus}`,
  );
  console.log(
    `At Risk: JavaScript=${javascriptMetrics.atRiskSkus}, SQL=${databaseMetrics.atRiskSkus}`,
  );
  console.log(
    `Inventory Value: JavaScript=${javascriptMetrics.inventoryValue.toFixed(2)}, SQL=${databaseMetrics.inventoryValue.toFixed(2)}`,
  );

  const inventoryValueDifference = Math.abs(
    javascriptMetrics.inventoryValue - databaseMetrics.inventoryValue,
  );

  const metricsMatch =
    javascriptMetrics.totalSkus === databaseMetrics.totalSkus &&
    javascriptMetrics.criticalRiskSkus ===
      databaseMetrics.criticalRiskSkus &&
    javascriptMetrics.atRiskSkus === databaseMetrics.atRiskSkus &&
    inventoryValueDifference < 0.01;

  console.log("");
  console.log(`Inventory value difference: ${inventoryValueDifference}`);

  if (!metricsMatch) {
    throw new Error(
      "Dashboard metrics do not match between JavaScript and PostgreSQL.",
    );
  }

  console.log("");
  console.log("=== VALIDATION PASSED ===");
  console.log(
    "PostgreSQL dashboard metrics match the original JavaScript calculations.",
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