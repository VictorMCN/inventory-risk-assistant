import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/database/prisma";

export type RiskDistributionItem = {
  level: "Low" | "Medium" | "High" | "Critical";
  count: number;
};

export type CategoryAnalyticsItem = {
  category: string;
  totalSkus: number;
  inventoryValue: number;
  lowRiskSkus: number;
  mediumRiskSkus: number;
  highRiskSkus: number;
  criticalRiskSkus: number;
  atRiskSkus: number;
};

export type InventoryAnalytics = {
  riskDistribution: RiskDistributionItem[];
  categories: CategoryAnalyticsItem[];
};

type DatabaseCategoryAnalytics = {
  category: string;
  totalSkus: number;
  inventoryValue: number;
  lowRiskSkus: number;
  mediumRiskSkus: number;
  highRiskSkus: number;
  criticalRiskSkus: number;
};

export async function getInventoryAnalytics(): Promise<InventoryAnalytics> {
  const rows = await prisma.$queryRaw<DatabaseCategoryAnalytics[]>(Prisma.sql`
    WITH base AS (
      SELECT
        category,
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
    ),

    classified AS (
      SELECT
        *,
        CASE
          WHEN risk_score >= 70 THEN 'Critical'
          WHEN risk_score >= 40 THEN 'High'
          WHEN risk_score >= 20 THEN 'Medium'
          ELSE 'Low'
        END AS risk_level
      FROM scored
    )

    SELECT
      category,

      COUNT(*)::integer AS "totalSkus",

      COALESCE(
        SUM(current_stock * unit_cost),
        0
      )::double precision AS "inventoryValue",

      COUNT(*) FILTER (
        WHERE risk_level = 'Low'
      )::integer AS "lowRiskSkus",

      COUNT(*) FILTER (
        WHERE risk_level = 'Medium'
      )::integer AS "mediumRiskSkus",

      COUNT(*) FILTER (
        WHERE risk_level = 'High'
      )::integer AS "highRiskSkus",

      COUNT(*) FILTER (
        WHERE risk_level = 'Critical'
      )::integer AS "criticalRiskSkus"

    FROM classified

    GROUP BY category

    ORDER BY
      SUM(current_stock * unit_cost) DESC,
      category ASC
  `);

  const categories: CategoryAnalyticsItem[] = rows.map((row) => ({
    ...row,
    atRiskSkus: row.highRiskSkus + row.criticalRiskSkus,
  }));

  const riskDistribution: RiskDistributionItem[] = [
    {
      level: "Low",
      count: categories.reduce(
        (total, category) => total + category.lowRiskSkus,
        0,
      ),
    },
    {
      level: "Medium",
      count: categories.reduce(
        (total, category) => total + category.mediumRiskSkus,
        0,
      ),
    },
    {
      level: "High",
      count: categories.reduce(
        (total, category) => total + category.highRiskSkus,
        0,
      ),
    },
    {
      level: "Critical",
      count: categories.reduce(
        (total, category) => total + category.criticalRiskSkus,
        0,
      ),
    },
  ];

  return {
    riskDistribution,
    categories,
  };
}