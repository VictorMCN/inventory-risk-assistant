import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/database/prisma";
import type { InventoryMetrics } from "@/lib/analytics/inventory-metrics";

type DatabaseDashboardMetrics = {
  totalSkus: number;
  criticalRiskSkus: number;
  atRiskSkus: number;
  inventoryValue: number;
};

export async function getDashboardMetrics(): Promise<InventoryMetrics> {
  const rows = await prisma.$queryRaw<DatabaseDashboardMetrics[]>(Prisma.sql`
    WITH base AS (
      SELECT
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
      COUNT(*)::integer AS "totalSkus",

      COUNT(*) FILTER (
        WHERE risk_score >= 70
      )::integer AS "criticalRiskSkus",

      COUNT(*) FILTER (
        WHERE risk_score >= 40
      )::integer AS "atRiskSkus",

      COALESCE(
        SUM(current_stock * unit_cost),
        0
      )::double precision AS "inventoryValue"

    FROM scored
  `);

  const metrics = rows[0];

  if (!metrics) {
    throw new Error("Unable to calculate dashboard metrics.");
  }

  return metrics;
}