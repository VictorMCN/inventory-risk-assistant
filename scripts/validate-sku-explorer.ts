import "dotenv/config";

import { getSkuExplorerPage } from "../src/lib/data/get-sku-explorer-page";
import { getSkusFromDatabase } from "../src/lib/data/get-skus-from-database";
import { prisma } from "../src/lib/database/prisma";
import { calculateRisk } from "../src/lib/risk/calculate-risk";
import type { RiskLevel } from "../src/types/risk";

const riskLevels: RiskLevel[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

async function main() {
  console.log("Validating database-powered SKU Explorer...");
  console.log("");

  const skus = await getSkusFromDatabase();

  const javascriptAssessments = new Map(
    skus.map((sku) => {
      const assessment = calculateRisk(sku);

      return [
        sku.skuId,
        {
          score: assessment.score,
          level: assessment.level,
          coverageDays: assessment.coverageDays,
        },
      ];
    }),
  );

  const allDatabaseResults = await getSkuExplorerPage({
    search: "",
    category: "All",
    supplier: "All",
    riskLevel: "All",
    sortOption: "risk-desc",
    page: 1,
    pageSize: skus.length,
  });

  const firstPage = await getSkuExplorerPage({
    search: "",
    category: "All",
    supplier: "All",
    riskLevel: "All",
    sortOption: "risk-desc",
    page: 1,
    pageSize: 25,
  });

  console.log("=== PAGINATION ===");
  console.log(`Database SKUs: ${skus.length}`);
  console.log(`Explorer total: ${allDatabaseResults.totalCount}`);
  console.log(`First page rows: ${firstPage.rows.length}`);
  console.log(`Total pages at 25/page: ${firstPage.totalPages}`);
  console.log("");

  if (allDatabaseResults.totalCount !== skus.length) {
    throw new Error(
      `Total count mismatch: expected ${skus.length}, received ${allDatabaseResults.totalCount}.`,
    );
  }

  if (firstPage.rows.length !== 25) {
    throw new Error(
      `Pagination mismatch: expected 25 rows, received ${firstPage.rows.length}.`,
    );
  }

  console.log("=== RISK DISTRIBUTION ===");

  for (const level of riskLevels) {
    const expectedCount = skus.filter(
      (sku) => calculateRisk(sku).level === level,
    ).length;

    const databaseResult = await getSkuExplorerPage({
      search: "",
      category: "All",
      supplier: "All",
      riskLevel: level,
      sortOption: "risk-desc",
      page: 1,
      pageSize: 25,
    });

    console.log(
      `${level}: JavaScript=${expectedCount}, SQL=${databaseResult.totalCount}`,
    );

    if (databaseResult.totalCount !== expectedCount) {
      throw new Error(
        `${level} risk count mismatch: JavaScript=${expectedCount}, SQL=${databaseResult.totalCount}.`,
      );
    }
  }

  console.log("");
  console.log("=== RISK ENGINE CONSISTENCY ===");

  const mismatches: string[] = [];

  for (const row of allDatabaseResults.rows) {
    const expected = javascriptAssessments.get(row.skuId);

    if (!expected) {
      mismatches.push(`${row.skuId}: missing JavaScript assessment`);
      continue;
    }

    const coverageMatches =
      (row.coverageDays === null && expected.coverageDays === null) ||
      (row.coverageDays !== null &&
        expected.coverageDays !== null &&
        Math.abs(row.coverageDays - expected.coverageDays) < 0.000001);

    if (
      row.riskScore !== expected.score ||
      row.riskLevel !== expected.level ||
      !coverageMatches
    ) {
      mismatches.push(
        `${row.skuId}: SQL=${row.riskScore}/${row.riskLevel}, JavaScript=${expected.score}/${expected.level}`,
      );
    }
  }

  console.log(`Compared SKUs: ${allDatabaseResults.rows.length}`);
  console.log(`Mismatches: ${mismatches.length}`);

  if (mismatches.length > 0) {
    console.log("");
    console.log("First mismatches:");

    for (const mismatch of mismatches.slice(0, 10)) {
      console.log(`- ${mismatch}`);
    }

    throw new Error("SQL risk logic does not match the JavaScript risk engine.");
  }

  console.log("");
  console.log("=== VALIDATION PASSED ===");
  console.log("SQL and JavaScript risk calculations are consistent.");
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