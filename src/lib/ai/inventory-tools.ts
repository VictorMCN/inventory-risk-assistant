import type { FunctionDeclaration } from "@google/genai";

import { getDashboardMetrics } from "@/lib/analytics/get-dashboard-metrics";
import { getInventoryAnalytics } from "@/lib/analytics/get-inventory-analytics";
import {
  getSkuExplorerPage,
  getSkuFilterOptions,
} from "@/lib/data/get-sku-explorer-page";
import { prisma } from "@/lib/database/prisma";
import { calculateRisk } from "@/lib/risk/calculate-risk";
import type {
  SkuSortOption,
} from "@/types/inventory-table";
import type { RiskLevel } from "@/types/risk";
import type { Sku } from "@/types/sku";

const riskLevels: RiskLevel[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

const sortOptions: SkuSortOption[] = [
  "risk-desc",
  "stock-asc",
  "stock-desc",
  "coverage-asc",
  "coverage-desc",
  "margin-desc",
];

export const inventoryToolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_inventory_summary",
    description:
      "Returns a high-level inventory summary including total SKUs, critical and at-risk counts, inventory value, risk distribution, and category-level analytics. Use this for portfolio-level questions.",
    parametersJsonSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },

  {
    name: "search_inventory",
    description:
      "Searches and prioritizes real inventory SKUs. Use this when the user asks for products, risky SKUs, items from a category or supplier, low stock, low coverage, or high-margin inventory.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description:
            "Optional SKU ID or product-name search text.",
        },
        category: {
          type: "string",
          description:
            "Optional product category such as FOOD, PET, APPAREL, or AUTOMOTIVE.",
        },
        supplier: {
          type: "string",
          description:
            "Optional supplier name.",
        },
        riskLevel: {
          type: "string",
          enum: ["Low", "Medium", "High", "Critical"],
          description:
            "Optional replenishment risk level.",
        },
        sort: {
          type: "string",
          enum: [
            "risk-desc",
            "stock-asc",
            "stock-desc",
            "coverage-asc",
            "coverage-desc",
            "margin-desc",
          ],
          description:
            "Optional result ordering. Defaults to highest replenishment risk first.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description:
            "Maximum number of SKUs to return. Defaults to 5 and cannot exceed 10.",
        },
      },
      additionalProperties: false,
    },
  },

  {
    name: "get_sku_details",
    description:
      "Returns detailed inventory and replenishment-risk information for one exact SKU ID.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        skuId: {
          type: "string",
          description:
            "Exact SKU identifier, for example SKU-008754.",
        },
      },
      required: ["skuId"],
      additionalProperties: false,
    },
  },
];

function getStringArgument(
  args: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = args[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getLimitArgument(args: Record<string, unknown>): number {
  const value = args.limit;

  if (
    typeof value !== "number" ||
    !Number.isInteger(value)
  ) {
    return 5;
  }

  return Math.min(10, Math.max(1, value));
}

async function resolveFilterValue(
  requestedValue: string | undefined,
  availableValues: string[],
): Promise<string> {
  if (!requestedValue) {
    return "All";
  }

  const normalizedRequestedValue =
    requestedValue.trim().toLowerCase();

  const match = availableValues.find(
    (value) =>
      value.toLowerCase() === normalizedRequestedValue,
  );

  return match ?? "All";
}

async function getInventorySummary() {
  const [metrics, analytics] = await Promise.all([
    getDashboardMetrics(),
    getInventoryAnalytics(),
  ]);

  return {
    snapshotDate: "2026-03-31",
    metrics,
    riskDistribution: analytics.riskDistribution,
    categories: analytics.categories.map((category) => ({
      category: category.category,
      totalSkus: category.totalSkus,
      atRiskSkus: category.atRiskSkus,
      criticalRiskSkus: category.criticalRiskSkus,
      inventoryValue: category.inventoryValue,
    })),
  };
}

async function searchInventory(
  args: Record<string, unknown>,
) {
  const filterOptions = await getSkuFilterOptions();

  const search = getStringArgument(args, "search") ?? "";

  const category = await resolveFilterValue(
    getStringArgument(args, "category"),
    filterOptions.categories,
  );

  const supplier = await resolveFilterValue(
    getStringArgument(args, "supplier"),
    filterOptions.suppliers,
  );

  const requestedRiskLevel =
    getStringArgument(args, "riskLevel");

  const riskLevel: "All" | RiskLevel =
    requestedRiskLevel &&
    riskLevels.includes(requestedRiskLevel as RiskLevel)
      ? (requestedRiskLevel as RiskLevel)
      : "All";

  const requestedSort = getStringArgument(args, "sort");

  const sortOption: SkuSortOption =
    requestedSort &&
    sortOptions.includes(requestedSort as SkuSortOption)
      ? (requestedSort as SkuSortOption)
      : "risk-desc";

  const limit = getLimitArgument(args);

  const result = await getSkuExplorerPage({
    search,
    category,
    supplier,
    riskLevel,
    sortOption,
    page: 1,
    pageSize: limit,
  });

  return {
    filters: {
      search: search || null,
      category: category === "All" ? null : category,
      supplier: supplier === "All" ? null : supplier,
      riskLevel: riskLevel === "All" ? null : riskLevel,
      sort: sortOption,
    },
    totalMatches: result.totalCount,
    returnedResults: result.rows.length,
    skus: result.rows,
  };
}

async function getSkuDetails(
  args: Record<string, unknown>,
) {
  const requestedSkuId = getStringArgument(args, "skuId");

  if (!requestedSkuId) {
    return {
      found: false,
      error: "A SKU ID is required.",
    };
  }

  const skuId = requestedSkuId.toUpperCase();

  const record = await prisma.sku.findUnique({
    where: {
      skuId,
    },
  });

  if (!record) {
    return {
      found: false,
      skuId,
    };
  }

  const sku: Sku = {
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
  };

  const risk = calculateRisk(sku);

  return {
    found: true,
    sku,
    risk,
  };
}

export async function executeInventoryTool(
  name: string,
  args: Record<string, unknown>,
) {
  switch (name) {
    case "get_inventory_summary":
      return getInventorySummary();

    case "search_inventory":
      return searchInventory(args);

    case "get_sku_details":
      return getSkuDetails(args);

    default:
      throw new Error(`Unknown inventory tool: ${name}`);
  }
}