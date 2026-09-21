import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/database/prisma";
import type {
  SkuExplorerQuery,
  SkuExplorerResult,
  SkuSortOption,
} from "@/types/inventory-table";
import type { RiskLevel } from "@/types/risk";

type DatabaseSkuRow = {
  skuId: string;
  skuName: string;
  category: string;
  supplier: string;
  currentStock: number;
  coverageDays: number | null;
  leadTimeDays: number;
  marginPct: number;
  riskScore: number;
  riskLevel: RiskLevel;
  totalCount: number;
};

const sortExpressions: Record<SkuSortOption, Prisma.Sql> = {
  "risk-desc": Prisma.sql`
    risk_score DESC,
    coverage_days ASC NULLS LAST,
    sku_id ASC
  `,

  "stock-asc": Prisma.sql`
    current_stock ASC,
    sku_id ASC
  `,

  "stock-desc": Prisma.sql`
    current_stock DESC,
    sku_id ASC
  `,

  "coverage-asc": Prisma.sql`
    coverage_days ASC NULLS LAST,
    sku_id ASC
  `,

  "coverage-desc": Prisma.sql`
    coverage_days DESC NULLS LAST,
    sku_id ASC
  `,

  "margin-desc": Prisma.sql`
    margin_pct DESC,
    sku_id ASC
  `,
};

export async function getSkuExplorerPage(
  query: SkuExplorerQuery,
): Promise<SkuExplorerResult> {
  const {
    search,
    category,
    supplier,
    riskLevel,
    sortOption,
    page,
    pageSize,
  } = query;

  const filters: Prisma.Sql[] = [];

  const normalizedSearch = search.trim();

  if (normalizedSearch) {
    const searchPattern = `%${normalizedSearch}%`;

    filters.push(
      Prisma.sql`
        (
          sku_id ILIKE ${searchPattern}
          OR sku_name ILIKE ${searchPattern}
        )
      `,
    );
  }

  if (category !== "All") {
    filters.push(Prisma.sql`category = ${category}`);
  }

  if (supplier !== "All") {
    filters.push(Prisma.sql`supplier = ${supplier}`);
  }

  const baseWhere =
    filters.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}`
      : Prisma.sql``;

  const riskWhere =
    riskLevel !== "All"
      ? Prisma.sql`WHERE risk_level = ${riskLevel}`
      : Prisma.sql``;

  const offset = (page - 1) * pageSize;
  const orderBy = sortExpressions[sortOption];

  const rows = await prisma.$queryRaw<DatabaseSkuRow[]>(Prisma.sql`
    WITH base AS (
      SELECT
        sku_id,
        sku_name,
        category,
        supplier,
        current_stock,
        lead_time_days,
        daily_sales_30d_avg,
        daily_sales_90d_avg,
        stockout_days_last_90d,
        seasonal_index,
        margin_pct,
        CASE
          WHEN daily_sales_30d_avg > 0
          THEN current_stock::numeric / daily_sales_30d_avg
          ELSE NULL
        END AS coverage_days
      FROM skus
      ${baseWhere}
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
      sku_id AS "skuId",
      sku_name AS "skuName",
      category,
      supplier,
      current_stock AS "currentStock",
      coverage_days::double precision AS "coverageDays",
      lead_time_days AS "leadTimeDays",
      margin_pct::double precision AS "marginPct",
      risk_score AS "riskScore",
      risk_level AS "riskLevel",
      COUNT(*) OVER()::integer AS "totalCount"
    FROM classified
    ${riskWhere}
    ORDER BY ${orderBy}
    LIMIT ${pageSize}
    OFFSET ${offset}
  `);

  const totalCount = rows[0]?.totalCount ?? 0;

  return {
    rows: rows.map((row) => ({
      skuId: row.skuId,
      skuName: row.skuName,
      category: row.category,
      supplier: row.supplier,
      currentStock: row.currentStock,
      coverageDays: row.coverageDays,
      leadTimeDays: row.leadTimeDays,
      marginPct: row.marginPct,
      riskScore: row.riskScore,
      riskLevel: row.riskLevel,
    })),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    page,
  };
}

export async function getSkuFilterOptions() {
  const [categoryRecords, supplierRecords] = await Promise.all([
    prisma.sku.findMany({
      distinct: ["category"],
      select: {
        category: true,
      },
      orderBy: {
        category: "asc",
      },
    }),

    prisma.sku.findMany({
      distinct: ["supplier"],
      select: {
        supplier: true,
      },
      orderBy: {
        supplier: "asc",
      },
    }),
  ]);

  return {
    categories: categoryRecords.map((record) => record.category),
    suppliers: supplierRecords.map((record) => record.supplier),
  };
}