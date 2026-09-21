import { prisma } from "@/lib/database/prisma";
import type { Sku } from "@/types/sku";

export async function getSkusFromDatabase(): Promise<Sku[]> {
  const records = await prisma.sku.findMany();

  return records.map((record): Sku => ({
    skuId: record.skuId,
    skuName: record.skuName,
    category: record.category,
    supplier: record.supplier,

    unitCost: record.unitCost.toNumber(),
    unitPrice: record.unitPrice.toNumber(),

    currentStock: record.currentStock,
    reorderPoint: record.reorderPoint,
    reorderQty: record.reorderQty,
    leadTimeDays: record.leadTimeDays,

    dailySales30dAvg: record.dailySales30dAvg.toNumber(),
    dailySales90dAvg: record.dailySales90dAvg.toNumber(),

    lastSaleDate: record.lastSaleDate
      ? record.lastSaleDate.toISOString().slice(0, 10)
      : null,

    lastReorderDate: record.lastReorderDate
      ? record.lastReorderDate.toISOString().slice(0, 10)
      : null,

    stockoutDaysLast90d: record.stockoutDaysLast90d,

    seasonalIndex: record.seasonalIndex.toNumber(),
    marginPct: record.marginPct.toNumber(),
  }));
}