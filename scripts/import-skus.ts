import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { loadSkus } from "../src/lib/data/load-skus";

const directUrl = process.env.DIRECT_URL;

if (!directUrl) {
  throw new Error("DIRECT_URL is not defined.");
}

const adapter = new PrismaPg({
  connectionString: directUrl,
});

const prisma = new PrismaClient({
  adapter,
});

const BATCH_SIZE = 500;

async function main() {
  const skus = loadSkus();

  console.log(`Preparing to import ${skus.length} SKUs...`);

  await prisma.sku.deleteMany();

  console.log("Existing SKU records cleared.");

  for (let index = 0; index < skus.length; index += BATCH_SIZE) {
    const batch = skus.slice(index, index + BATCH_SIZE);

    await prisma.sku.createMany({
      data: batch.map((sku) => ({
        skuId: sku.skuId,
        skuName: sku.skuName,
        category: sku.category,
        supplier: sku.supplier,
        unitCost: sku.unitCost,
        unitPrice: sku.unitPrice,
        currentStock: sku.currentStock,
        reorderPoint: sku.reorderPoint,
        reorderQty: sku.reorderQty,
        leadTimeDays: sku.leadTimeDays,
        dailySales30dAvg: sku.dailySales30dAvg,
        dailySales90dAvg: sku.dailySales90dAvg,
        lastSaleDate: sku.lastSaleDate
          ? new Date(`${sku.lastSaleDate}T00:00:00Z`)
          : null,
        lastReorderDate: sku.lastReorderDate
          ? new Date(`${sku.lastReorderDate}T00:00:00Z`)
          : null,
        stockoutDaysLast90d: sku.stockoutDaysLast90d,
        seasonalIndex: sku.seasonalIndex,
        marginPct: sku.marginPct,
      })),
    });

    const imported = Math.min(index + BATCH_SIZE, skus.length);

    console.log(`Imported ${imported}/${skus.length} SKUs`);
  }

  const databaseCount = await prisma.sku.count();

  console.log("");
  console.log("=== IMPORT COMPLETE ===");
  console.log(`CSV records: ${skus.length}`);
  console.log(`Database records: ${databaseCount}`);

  if (databaseCount !== skus.length) {
    throw new Error(
      `Import validation failed. Expected ${skus.length} records but found ${databaseCount}.`,
    );
  }
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