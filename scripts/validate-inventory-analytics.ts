import "dotenv/config";

import { getDashboardMetrics } from "../src/lib/analytics/get-dashboard-metrics";
import { getInventoryAnalytics } from "../src/lib/analytics/get-inventory-analytics";
import { prisma } from "../src/lib/database/prisma";

async function main() {
  console.log("Validating inventory analytics...");
  console.log("");

  const [analytics, dashboardMetrics] = await Promise.all([
    getInventoryAnalytics(),
    getDashboardMetrics(),
  ]);

  const totalFromRiskDistribution = analytics.riskDistribution.reduce(
    (total, item) => total + item.count,
    0,
  );

  const totalFromCategories = analytics.categories.reduce(
    (total, category) => total + category.totalSkus,
    0,
  );

  const inventoryValueFromCategories = analytics.categories.reduce(
    (total, category) => total + category.inventoryValue,
    0,
  );

  const atRiskFromCategories = analytics.categories.reduce(
    (total, category) => total + category.atRiskSkus,
    0,
  );

  console.log("=== RISK DISTRIBUTION ===");

  for (const item of analytics.riskDistribution) {
    console.log(`${item.level}: ${item.count}`);
  }

  console.log("");
  console.log(`Risk distribution total: ${totalFromRiskDistribution}`);
  console.log("");

  console.log("=== CATEGORY AGGREGATION ===");
  console.log(`Categories: ${analytics.categories.length}`);
  console.log(`Category SKU total: ${totalFromCategories}`);
  console.log(
    `Category inventory value: ${inventoryValueFromCategories.toFixed(2)}`,
  );
  console.log(`Category at-risk total: ${atRiskFromCategories}`);
  console.log("");

  console.log("=== DASHBOARD COMPARISON ===");
  console.log(`Dashboard total SKUs: ${dashboardMetrics.totalSkus}`);
  console.log(`Dashboard critical risk: ${dashboardMetrics.criticalRiskSkus}`);
  console.log(`Dashboard at risk: ${dashboardMetrics.atRiskSkus}`);
  console.log(
    `Dashboard inventory value: ${dashboardMetrics.inventoryValue.toFixed(2)}`,
  );

  const criticalRisk =
    analytics.riskDistribution.find(
      (item) => item.level === "Critical",
    )?.count ?? 0;

  const inventoryValueDifference = Math.abs(
    inventoryValueFromCategories - dashboardMetrics.inventoryValue,
  );

  const validationPassed =
    totalFromRiskDistribution === dashboardMetrics.totalSkus &&
    totalFromCategories === dashboardMetrics.totalSkus &&
    criticalRisk === dashboardMetrics.criticalRiskSkus &&
    atRiskFromCategories === dashboardMetrics.atRiskSkus &&
    inventoryValueDifference < 0.01;

  console.log("");
  console.log(
    `Inventory value difference: ${inventoryValueDifference}`,
  );

  if (!validationPassed) {
    throw new Error(
      "Inventory analytics do not match the validated dashboard metrics.",
    );
  }

  console.log("");
  console.log("=== VALIDATION PASSED ===");
  console.log(
    "Inventory analytics are consistent with the dashboard metrics.",
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