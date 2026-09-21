import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/database/prisma";

export type StaleInventorySummary = {
  staleSkus: number;
  inventoryValue: number;
  highMarginStaleSkus: number;
};

export type SupplierRiskItem = {
  supplier: string;
  totalSkus: number;
  atRiskSkus: number;
  criticalRiskSkus: number;
  inventoryValue: number;
  atRiskRatePct: number;
};

export type InventoryHealthAnalytics = {
  staleInventory: StaleInventorySummary;
  suppliers: SupplierRiskItem[];
};

type DatabaseStaleInventorySummary = {
  staleSkus: number;
  inventoryValue: number;
  highMarginStaleSkus: number;
};

type DatabaseSupplierRiskItem = {
  supplier: string;
  totalSkus: number;
  atRiskSkus: number;
  criticalRiskSkus: number;
  inventoryValue: number;
};

export async function getInventoryHealthAnalytics(): Promise<InventoryHealthAnalytics> {
  const [staleRows, supplierRows] = await Promise.all([
    prisma.$queryRaw<DatabaseStaleInventorySummary[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (
          WHERE
            last_sale_date IS NOT NULL
            AND DATE '2026-03-31' - last_sale_date >= 60
        )::integer AS "staleSkus",

        COALESCE(
          SUM(current_stock * unit_cost) FILTER (
            WHERE
              last_sale_date IS NOT NULL
              AND DATE '2026-03-31' - last_sale_date >= 60
          ),
          0
        )::double precision AS "inventoryValue",

        COUNT(*) FILTER (
          WHERE
            last_sale_date IS NOT NULL
            AND DATE '2026-03-31' - last_sale_date >= 60
            AND margin_pct > 50
        )::integer AS "highMarginStaleSkus"

      FROM skus
    `),

    prisma.$queryRaw<DatabaseSupplierRiskItem[]>(Prisma.sql`
      WITH base AS (
        SELECT
          supplier,
          current_stock,
          unit_cost,
          lead_time_days,
          daily_sales_30d_avg,
          daily_sales_90d_avg,
          stockout_days_last_90d,
          seasonal_index,

          CASE
            WHEN daily_sales_30d_avg > 0
            THEN current_stock::numeric / daily_sales_30d_avg
            ELSE NULL
          END AS coverage_days

        FROM skus
      ),

      scored AS (
        SELECT
          *,

          CASE
            WHEN current_stock = 0
              AND daily_sales_30d_avg > 0
            THEN 100

            ELSE LEAST(
              (
                CASE
                  WHEN coverage_days IS NOT NULL
                    AND lead_time_days > 0
                    AND coverage_days / lead_time_days < 0.5
                  THEN 50

                  WHEN coverage_days IS NOT NULL
                    AND lead_time_days > 0
                    AND coverage_days / lead_time_days < 1
                  THEN 40

                  ELSE 0
                END
              )
              +
              (
                CASE
                  WHEN stockout_days_last_90d > 10
                  THEN 20

                  WHEN stockout_days_last_90d > 0
                  THEN 10

                  ELSE 0
                END
              )
              +
              (
                CASE
                  WHEN daily_sales_30d_avg > daily_sales_90d_avg * 1.2
                  THEN 10

                  ELSE 0
                END
              )
              +
              (
                CASE
                  WHEN seasonal_index > 1.2
                  THEN 5

                  ELSE 0
                END
              ),
              100
            )
          END AS risk_score

        FROM base
      )

      SELECT
        supplier,

        COUNT(*)::integer AS "totalSkus",

        COUNT(*) FILTER (
          WHERE risk_score >= 40
        )::integer AS "atRiskSkus",

        COUNT(*) FILTER (
          WHERE risk_score >= 70
        )::integer AS "criticalRiskSkus",

        COALESCE(
          SUM(current_stock * unit_cost),
          0
        )::double precision AS "inventoryValue"

      FROM scored

      GROUP BY supplier

      ORDER BY
        COUNT(*) FILTER (
          WHERE risk_score >= 40
        ) DESC,
        COUNT(*) FILTER (
          WHERE risk_score >= 70
        ) DESC,
        supplier ASC
    `),
  ]);

  const staleInventory = staleRows[0];

  if (!staleInventory) {
    throw new Error(
      "Unable to calculate stale inventory analytics.",
    );
  }

  const suppliers: SupplierRiskItem[] = supplierRows.map(
    (supplier) => ({
      ...supplier,

      atRiskRatePct:
        supplier.totalSkus > 0
          ? (supplier.atRiskSkus / supplier.totalSkus) * 100
          : 0,
    }),
  );

  return {
    staleInventory,
    suppliers,
  };
}