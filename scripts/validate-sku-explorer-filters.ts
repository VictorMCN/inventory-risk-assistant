import "dotenv/config";

import { getSkuExplorerPage } from "../src/lib/data/get-sku-explorer-page";
import { getSkusFromDatabase } from "../src/lib/data/get-skus-from-database";
import { prisma } from "../src/lib/database/prisma";
import { calculateRisk } from "../src/lib/risk/calculate-risk";

function getCoverageDays(
  currentStock: number,
  dailySales30dAvg: number,
): number | null {
  if (dailySales30dAvg <= 0) {
    return null;
  }

  return currentStock / dailySales30dAvg;
}

async function main() {
  console.log("Validating SKU Explorer numeric filters...");
  console.log("");

  const skus = await getSkusFromDatabase();

  const maxStock = 50;
  const maxCoverageDays = 7;
  const minMarginPct = 40;

  const stockResult = await getSkuExplorerPage({
    search: "",
    category: "All",
    supplier: "All",
    riskLevel: "All",
    maxStock,
    maxCoverageDays: null,
    minMarginPct: null,
    sortOption: "risk-desc",
    page: 1,
    pageSize: 25,
  });

  const expectedStockCount = skus.filter(
    (sku) => sku.currentStock <= maxStock,
  ).length;

  console.log("=== MAXIMUM STOCK ===");

  console.log(
    `Expected: ${expectedStockCount}, SQL: ${stockResult.totalCount}`,
  );

  const coverageResult = await getSkuExplorerPage({
    search: "",
    category: "All",
    supplier: "All",
    riskLevel: "All",
    maxStock: null,
    maxCoverageDays,
    minMarginPct: null,
    sortOption: "coverage-asc",
    page: 1,
    pageSize: 25,
  });

  const expectedCoverageCount = skus.filter((sku) => {
    const coverageDays = getCoverageDays(
      sku.currentStock,
      sku.dailySales30dAvg,
    );

    return (
      coverageDays !== null &&
      coverageDays <= maxCoverageDays
    );
  }).length;

  console.log("");
  console.log("=== MAXIMUM COVERAGE ===");

  console.log(
    `Expected: ${expectedCoverageCount}, SQL: ${coverageResult.totalCount}`,
  );

  const marginResult = await getSkuExplorerPage({
    search: "",
    category: "All",
    supplier: "All",
    riskLevel: "All",
    maxStock: null,
    maxCoverageDays: null,
    minMarginPct,
    sortOption: "margin-desc",
    page: 1,
    pageSize: 25,
  });

  const expectedMarginCount = skus.filter(
    (sku) => sku.marginPct >= minMarginPct,
  ).length;

  console.log("");
  console.log("=== MINIMUM MARGIN ===");

  console.log(
    `Expected: ${expectedMarginCount}, SQL: ${marginResult.totalCount}`,
  );

  const combinedResult = await getSkuExplorerPage({
    search: "",
    category: "FOOD",
    supplier: "All",
    riskLevel: "Critical",
    maxStock: null,
    maxCoverageDays: 7,
    minMarginPct: 40,
    sortOption: "risk-desc",
    page: 1,
    pageSize: 25,
  });

  const expectedCombinedCount = skus.filter((sku) => {
    if (sku.category !== "FOOD") {
      return false;
    }

    if (calculateRisk(sku).level !== "Critical") {
      return false;
    }

    const coverageDays = getCoverageDays(
      sku.currentStock,
      sku.dailySales30dAvg,
    );

    if (
      coverageDays === null ||
      coverageDays > 7
    ) {
      return false;
    }

    if (sku.marginPct < 40) {
      return false;
    }

    return true;
  }).length;

  console.log("");
  console.log("=== COMBINED FILTERS ===");

  console.log(
    "Category: FOOD | Risk: Critical | Coverage <= 7 | Margin >= 40%",
  );

  console.log(
    `Expected: ${expectedCombinedCount}, SQL: ${combinedResult.totalCount}`,
  );

  const validationPassed =
    stockResult.totalCount ===
      expectedStockCount &&
    coverageResult.totalCount ===
      expectedCoverageCount &&
    marginResult.totalCount ===
      expectedMarginCount &&
    combinedResult.totalCount ===
      expectedCombinedCount;

  if (!validationPassed) {
    throw new Error(
      "SKU Explorer numeric filters do not match the validated application logic.",
    );
  }

  console.log("");
  console.log("=== VALIDATION PASSED ===");

  console.log(
    "All numeric SKU Explorer filters match the expected results.",
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