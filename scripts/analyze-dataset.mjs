import fs from "node:fs";

import { parse } from "csv-parse/sync";

const SNAPSHOT_DATE = new Date("2026-03-31T00:00:00Z");

const fileContent = fs.readFileSync("data/skus.csv", "utf-8");

const records = parse(fileContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

const skus = records.map((record) => ({
  ...record,
  unitCost: Number(record.unitCost),
  unitPrice: Number(record.unitPrice),
  currentStock: Number(record.currentStock),
  reorderPoint: Number(record.reorderPoint),
  reorderQty: Number(record.reorderQty),
  leadTimeDays: Number(record.leadTimeDays),
  dailySales30dAvg: Number(record.dailySales30dAvg),
  dailySales90dAvg: Number(record.dailySales90dAvg),
  stockoutDaysLast90d: Number(record.stockoutDaysLast90d),
  seasonalIndex: Number(record.seasonalIndex),
  marginPct: Number(record.marginPct),
}));

function percentage(amount) {
  return `${amount} (${((amount / skus.length) * 100).toFixed(1)}%)`;
}

function daysSince(dateString) {
  if (!dateString) {
    return Infinity;
  }

  const date = new Date(`${dateString}T00:00:00Z`);

  return (SNAPSHOT_DATE - date) / (1000 * 60 * 60 * 24);
}

const totalInventoryValue = skus.reduce(
  (total, sku) => total + sku.currentStock * sku.unitCost,
  0,
);

const categories = new Set(skus.map((sku) => sku.category));
const suppliers = new Set(skus.map((sku) => sku.supplier));

const zeroStock = skus.filter((sku) => sku.currentStock === 0).length;

const zeroRecentSales = skus.filter(
  (sku) => sku.dailySales30dAvg === 0,
).length;

const belowReorderPoint = skus.filter(
  (sku) => sku.currentStock <= sku.reorderPoint,
).length;

const coverageBelowLeadTime = skus.filter((sku) => {
  if (sku.dailySales30dAvg === 0) {
    return false;
  }

  const coverageDays = sku.currentStock / sku.dailySales30dAvg;

  return coverageDays < sku.leadTimeDays;
}).length;

const severeCoverageRisk = skus.filter((sku) => {
  if (sku.dailySales30dAvg === 0) {
    return false;
  }

  const coverageDays = sku.currentStock / sku.dailySales30dAvg;

  return coverageDays < sku.leadTimeDays * 0.5;
}).length;

const previousStockout = skus.filter(
  (sku) => sku.stockoutDaysLast90d > 0,
).length;

const repeatedStockout = skus.filter(
  (sku) => sku.stockoutDaysLast90d > 10,
).length;

const acceleratingDemand = skus.filter(
  (sku) => sku.dailySales30dAvg > sku.dailySales90dAvg * 1.2,
).length;

const highSeasonality = skus.filter(
  (sku) => sku.seasonalIndex > 1.2,
).length;

const highMargin = skus.filter(
  (sku) => sku.marginPct > 50,
).length;

const staleInventory = skus.filter(
  (sku) => daysSince(sku.lastSaleDate) >= 60,
);

const staleInventoryValue = staleInventory.reduce(
  (total, sku) => total + sku.currentStock * sku.unitCost,
  0,
);

console.log("\n=== DATASET OVERVIEW ===");
console.log(`Total SKUs: ${skus.length}`);
console.log(`Categories: ${categories.size}`);
console.log(`Suppliers: ${suppliers.size}`);
console.log(
  `Inventory value: ${totalInventoryValue.toLocaleString("en-US", {
    style: "currency",
    currency: "BRL",
  })}`,
);

console.log("\n=== REPLENISHMENT SIGNALS ===");
console.log(`Zero stock: ${percentage(zeroStock)}`);
console.log(
  `At or below reorder point: ${percentage(belowReorderPoint)}`,
);
console.log(
  `Coverage below supplier lead time: ${percentage(coverageBelowLeadTime)}`,
);
console.log(
  `Coverage below 50% of lead time: ${percentage(severeCoverageRisk)}`,
);

console.log("\n=== HISTORICAL AND DEMAND SIGNALS ===");
console.log(
  `Had stockout in last 90 days: ${percentage(previousStockout)}`,
);
console.log(
  `More than 10 stockout days: ${percentage(repeatedStockout)}`,
);
console.log(
  `Demand growing more than 20%: ${percentage(acceleratingDemand)}`,
);
console.log(
  `Seasonal index above 1.2: ${percentage(highSeasonality)}`,
);
console.log(`Margin above 50%: ${percentage(highMargin)}`);

console.log("\n=== INVENTORY HEALTH ===");
console.log(
  `No average sales in last 30 days: ${percentage(zeroRecentSales)}`,
);
console.log(
  `No sale for at least 60 days: ${percentage(staleInventory.length)}`,
);
console.log(
  `Capital tied in stale inventory: ${staleInventoryValue.toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "BRL",
    },
  )}`,
);