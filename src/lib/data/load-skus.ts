import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import type { Sku } from "@/types/sku";

type CsvSku = {
  skuId: string;
  skuName: string;
  category: string;
  supplier: string;
  unitCost: string;
  unitPrice: string;
  currentStock: string;
  reorderPoint: string;
  reorderQty: string;
  leadTimeDays: string;
  dailySales30dAvg: string;
  dailySales90dAvg: string;
  lastSaleDate: string;
  lastReorderDate: string;
  stockoutDaysLast90d: string;
  seasonalIndex: string;
  marginPct: string;
};

export function loadSkus(): Sku[] {
  const filePath = path.join(process.cwd(), "data", "skus.csv");

  const fileContent = fs.readFileSync(filePath, "utf-8");

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvSku[];

  return records.map((record) => ({
    skuId: record.skuId,
    skuName: record.skuName,
    category: record.category,
    supplier: record.supplier,
    unitCost: Number(record.unitCost),
    unitPrice: Number(record.unitPrice),
    currentStock: Number(record.currentStock),
    reorderPoint: Number(record.reorderPoint),
    reorderQty: Number(record.reorderQty),
    leadTimeDays: Number(record.leadTimeDays),
    dailySales30dAvg: Number(record.dailySales30dAvg),
    dailySales90dAvg: Number(record.dailySales90dAvg),
    lastSaleDate: record.lastSaleDate || null,
    lastReorderDate: record.lastReorderDate || null,
    stockoutDaysLast90d: Number(record.stockoutDaysLast90d),
    seasonalIndex: Number(record.seasonalIndex),
    marginPct: Number(record.marginPct),
  }));
}