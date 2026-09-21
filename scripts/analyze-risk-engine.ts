import { loadSkus } from "../src/lib/data/load-skus";
import { calculateRisk } from "../src/lib/risk/calculate-risk";
import type { RiskLevel } from "../src/types/risk";

const skus = loadSkus();

const analyzedSkus = skus.map((sku) => ({
  sku,
  assessment: calculateRisk(sku),
}));

const levelCounts: Record<RiskLevel, number> = {
  Low: 0,
  Medium: 0,
  High: 0,
  Critical: 0,
};

for (const { assessment } of analyzedSkus) {
  levelCounts[assessment.level]++;
}

const atRiskCount = levelCounts.High + levelCounts.Critical;

const coverageRiskCount = analyzedSkus.filter(
  ({ assessment }) =>
    assessment.coverageRatio !== null &&
    assessment.coverageRatio < 1,
).length;

const atRiskWithoutCoverageRisk = analyzedSkus.filter(
  ({ assessment }) =>
    (assessment.level === "High" ||
      assessment.level === "Critical") &&
    !(
      assessment.coverageRatio !== null &&
      assessment.coverageRatio < 1
    ),
);

const staleInventoryCount = analyzedSkus.filter(({ assessment }) =>
  assessment.healthFlags.includes("STALE_INVENTORY"),
).length;

const highMarginAtRiskCount = analyzedSkus.filter(
  ({ sku, assessment }) =>
    sku.marginPct > 50 &&
    (assessment.level === "High" ||
      assessment.level === "Critical"),
).length;

const reasonCounts = new Map<string, number>();

for (const { assessment } of analyzedSkus) {
  for (const reason of assessment.reasons) {
    reasonCounts.set(
      reason,
      (reasonCounts.get(reason) ?? 0) + 1,
    );
  }
}

const sortedReasons = [...reasonCounts.entries()].sort(
  (a, b) => b[1] - a[1],
);

const criticalExamples = analyzedSkus
  .filter(({ assessment }) => assessment.level === "Critical")
  .sort((a, b) => {
    if (b.assessment.score !== a.assessment.score) {
      return b.assessment.score - a.assessment.score;
    }

    return (
      (a.assessment.coverageRatio ?? Infinity) -
      (b.assessment.coverageRatio ?? Infinity)
    );
  })
  .slice(0, 10);

console.log("\n=== RISK DISTRIBUTION ===");
console.log(`Low: ${levelCounts.Low}`);
console.log(`Medium: ${levelCounts.Medium}`);
console.log(`High: ${levelCounts.High}`);
console.log(`Critical: ${levelCounts.Critical}`);
console.log(`High + Critical: ${atRiskCount}`);

console.log("\n=== VALIDATION ===");
console.log(`Coverage below lead time: ${coverageRiskCount}`);
console.log(
  `High/Critical without coverage risk: ${atRiskWithoutCoverageRisk.length}`,
);
console.log(`Stale inventory: ${staleInventoryCount}`);
console.log(
  `High-margin SKUs currently at risk: ${highMarginAtRiskCount}`,
);

console.log("\n=== TRIGGERED RISK FACTORS ===");

for (const [reason, count] of sortedReasons) {
  console.log(`${reason}: ${count}`);
}

console.log("\n=== HIGH/CRITICAL WITHOUT COVERAGE RISK ===");

for (const { sku, assessment } of atRiskWithoutCoverageRisk) {
  console.log("\n----------------------------------------");
  console.log(`${sku.skuId} - ${sku.skuName}`);
  console.log(`Category: ${sku.category}`);
  console.log(`Supplier: ${sku.supplier}`);
  console.log(`Score: ${assessment.score}`);
  console.log(`Level: ${assessment.level}`);
  console.log(`Current stock: ${sku.currentStock}`);
  console.log(`Daily sales 30d: ${sku.dailySales30dAvg}`);
  console.log(`Daily sales 90d: ${sku.dailySales90dAvg}`);
  console.log(
    `Coverage days: ${
      assessment.coverageDays?.toFixed(2) ?? "N/A"
    }`,
  );
  console.log(`Lead time: ${sku.leadTimeDays} days`);
  console.log(
    `Coverage ratio: ${
      assessment.coverageRatio?.toFixed(2) ?? "N/A"
    }`,
  );
  console.log(
    `Stockout days (90d): ${sku.stockoutDaysLast90d}`,
  );
  console.log(`Seasonal index: ${sku.seasonalIndex}`);
  console.log(`Margin: ${sku.marginPct}%`);
  console.log("Reasons:");

  for (const reason of assessment.reasons) {
    console.log(`- ${reason}`);
  }
}

console.log("\n=== TOP 10 CRITICAL EXAMPLES ===");

for (const { sku, assessment } of criticalExamples) {
  console.log("\n----------------------------------------");
  console.log(`${sku.skuId} - ${sku.skuName}`);
  console.log(`Category: ${sku.category}`);
  console.log(`Supplier: ${sku.supplier}`);
  console.log(`Score: ${assessment.score}`);
  console.log(`Level: ${assessment.level}`);
  console.log(
    `Coverage days: ${
      assessment.coverageDays?.toFixed(2) ?? "N/A"
    }`,
  );
  console.log(`Lead time: ${sku.leadTimeDays} days`);
  console.log(
    `Stockout days (90d): ${sku.stockoutDaysLast90d}`,
  );
  console.log(`Margin: ${sku.marginPct}%`);
  console.log(`Seasonal index: ${sku.seasonalIndex}`);
  console.log("Reasons:");

  for (const reason of assessment.reasons) {
    console.log(`- ${reason}`);
  }
}