import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/database/prisma";
import { calculateRisk } from "@/lib/risk/calculate-risk";
import type { RiskLevel } from "@/types/risk";
import type { Sku } from "@/types/sku";

export type StaleInventorySort =
  | "stale-days-desc"
  | "margin-desc"
  | "inventory-value-desc";

export type StaleInventoryQuery = {
  minDaysSinceLastSale: number;
  minMarginPct: number | null;
  category: string;
  supplier: string;
  sort: StaleInventorySort;
  limit: number;
};

export type StaleInventoryItem = {
  skuId: string;
  skuName: string;
  category: string;
  supplier: string;
  currentStock: number;
  lastSaleDate: string;
  daysSinceLastSale: number;
  marginPct: number;
  inventoryValue: number;
  riskScore: number;
  riskLevel: RiskLevel;
};

export type StaleInventoryResult = {
  totalMatches: number;
  returnedResults: number;
  skus: StaleInventoryItem[];
};

type DatabaseStaleInventoryRow = {
  skuId: string;
  skuName: string;
  category: string;
  supplier: string;
  unitCost: number;
  unitPrice: number;
  currentStock: number;
  reorderPoint: number;
  reorderQty: number;
  leadTimeDays: number;
  dailySales30dAvg: number;
  dailySales90dAvg: number;
  lastSaleDate: Date;
  lastReorderDate: Date | null;
  stockoutDaysLast90d: number;
  seasonalIndex: number;
  marginPct: number;
  daysSinceLastSale: number;
  inventoryValue: number;
  totalCount: number;
};

const sortExpressions: Record<
  StaleInventorySort,
  Prisma.Sql
> = {
  "stale-days-desc": Prisma.sql`
    "daysSinceLastSale" DESC,
    "skuId" ASC
  `,

  "margin-desc": Prisma.sql`
    "marginPct" DESC,
    "daysSinceLastSale" DESC,
    "skuId" ASC
  `,

  "inventory-value-desc": Prisma.sql`
    "inventoryValue" DESC,
    "daysSinceLastSale" DESC,
    "skuId" ASC
  `,
};

export async function searchStaleInventory(
  query: StaleInventoryQuery,
): Promise<StaleInventoryResult> {
  const filters: Prisma.Sql[] = [
    Prisma.sql`last_sale_date IS NOT NULL`,
    Prisma.sql`
      DATE '2026-03-31' - last_sale_date >= ${query.minDaysSinceLastSale}
    `,
  ];

  if (query.minMarginPct !== null) {
    filters.push(
      Prisma.sql`margin_pct >= ${query.minMarginPct}`,
    );
  }

  if (query.category !== "All") {
    filters.push(
      Prisma.sql`category = ${query.category}`,
    );
  }

  if (query.supplier !== "All") {
    filters.push(
      Prisma.sql`supplier = ${query.supplier}`,
    );
  }

  const where = Prisma.sql`
    WHERE ${Prisma.join(filters, " AND ")}
  `;

  const orderBy = sortExpressions[query.sort];

  const rows =
    await prisma.$queryRaw<DatabaseStaleInventoryRow[]>(
      Prisma.sql`
        SELECT
          sku_id AS "skuId",
          sku_name AS "skuName",
          category,
          supplier,

          unit_cost::double precision AS "unitCost",
          unit_price::double precision AS "unitPrice",

          current_stock AS "currentStock",
          reorder_point AS "reorderPoint",
          reorder_qty AS "reorderQty",
          lead_time_days AS "leadTimeDays",

          daily_sales_30d_avg::double precision AS "dailySales30dAvg",
          daily_sales_90d_avg::double precision AS "dailySales90dAvg",

          last_sale_date AS "lastSaleDate",
          last_reorder_date AS "lastReorderDate",

          stockout_days_last_90d AS "stockoutDaysLast90d",
          seasonal_index::double precision AS "seasonalIndex",
          margin_pct::double precision AS "marginPct",

          (
            DATE '2026-03-31' - last_sale_date
          )::integer AS "daysSinceLastSale",

          (
            current_stock * unit_cost
          )::double precision AS "inventoryValue",

          COUNT(*) OVER()::integer AS "totalCount"

        FROM skus

        ${where}

        ORDER BY ${orderBy}

        LIMIT ${query.limit}
      `,
    );

  const totalMatches = rows[0]?.totalCount ?? 0;

  const skus: StaleInventoryItem[] = rows.map((row) => {
    const sku: Sku = {
      skuId: row.skuId,
      skuName: row.skuName,
      category: row.category,
      supplier: row.supplier,

      unitCost: row.unitCost,
      unitPrice: row.unitPrice,

      currentStock: row.currentStock,
      reorderPoint: row.reorderPoint,
      reorderQty: row.reorderQty,
      leadTimeDays: row.leadTimeDays,

      dailySales30dAvg: row.dailySales30dAvg,
      dailySales90dAvg: row.dailySales90dAvg,

      lastSaleDate: row.lastSaleDate
        .toISOString()
        .slice(0, 10),

      lastReorderDate: row.lastReorderDate
        ? row.lastReorderDate.toISOString().slice(0, 10)
        : null,

      stockoutDaysLast90d:
        row.stockoutDaysLast90d,

      seasonalIndex: row.seasonalIndex,
      marginPct: row.marginPct,
    };

    const risk = calculateRisk(sku);

    return {
      skuId: row.skuId,
      skuName: row.skuName,
      category: row.category,
      supplier: row.supplier,
      currentStock: row.currentStock,

      lastSaleDate: row.lastSaleDate
        .toISOString()
        .slice(0, 10),

      daysSinceLastSale: row.daysSinceLastSale,
      marginPct: row.marginPct,
      inventoryValue: row.inventoryValue,

      riskScore: risk.score,
      riskLevel: risk.level,
    };
  });

  return {
    totalMatches,
    returnedResults: skus.length,
    skus,
  };
}