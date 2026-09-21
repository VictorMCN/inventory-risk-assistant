import { NextRequest, NextResponse } from "next/server";

import { getSkuExplorerPage } from "@/lib/data/get-sku-explorer-page";
import type { SkuSortOption } from "@/types/inventory-table";
import type { RiskLevel } from "@/types/risk";

const validRiskLevels = new Set<RiskLevel>([
  "Low",
  "Medium",
  "High",
  "Critical",
]);

const validSortOptions =
  new Set<SkuSortOption>([
    "risk-desc",
    "stock-asc",
    "stock-desc",
    "coverage-asc",
    "coverage-desc",
    "margin-desc",
  ]);

const PAGE_SIZE = 25;

type NumberValidationOptions = {
  minimum?: number;
  maximum?: number;
  integer?: boolean;
};

function parseOptionalNumber(
  value: string | null,
  options: NumberValidationOptions = {},
): number | null {
  if (
    value === null ||
    value.trim().length === 0
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (
    options.integer &&
    !Number.isInteger(parsed)
  ) {
    return null;
  }

  if (
    options.minimum !== undefined &&
    parsed < options.minimum
  ) {
    return null;
  }

  if (
    options.maximum !== undefined &&
    parsed > options.maximum
  ) {
    return null;
  }

  return parsed;
}

export async function GET(
  request: NextRequest,
) {
  const { searchParams } = request.nextUrl;

  const search =
    searchParams.get("search") ?? "";

  const category =
    searchParams.get("category") ?? "All";

  const supplier =
    searchParams.get("supplier") ?? "All";

  const requestedRiskLevel =
    searchParams.get("riskLevel") ?? "All";

  const riskLevel: "All" | RiskLevel =
    requestedRiskLevel === "All" ||
    validRiskLevels.has(
      requestedRiskLevel as RiskLevel,
    )
      ? (requestedRiskLevel as
          | "All"
          | RiskLevel)
      : "All";

  const requestedSort =
    searchParams.get("sort") ??
    "risk-desc";

  const sortOption: SkuSortOption =
    validSortOptions.has(
      requestedSort as SkuSortOption,
    )
      ? (requestedSort as SkuSortOption)
      : "risk-desc";

  const requestedPage = Number(
    searchParams.get("page") ?? "1",
  );

  const page =
    Number.isInteger(requestedPage) &&
    requestedPage > 0
      ? requestedPage
      : 1;

  const maxStock = parseOptionalNumber(
    searchParams.get("maxStock"),
    {
      minimum: 0,
      integer: true,
    },
  );

  const maxCoverageDays =
    parseOptionalNumber(
      searchParams.get(
        "maxCoverageDays",
      ),
      {
        minimum: 0,
      },
    );

  const minMarginPct =
    parseOptionalNumber(
      searchParams.get("minMarginPct"),
      {
        minimum: 0,
        maximum: 100,
      },
    );

  const result =
    await getSkuExplorerPage({
      search,
      category,
      supplier,
      riskLevel,

      maxStock,
      maxCoverageDays,
      minMarginPct,

      sortOption,
      page,
      pageSize: PAGE_SIZE,
    });

  return NextResponse.json(result);
}