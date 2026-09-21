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

const validSortOptions = new Set<SkuSortOption>([
  "risk-desc",
  "stock-asc",
  "stock-desc",
  "coverage-asc",
  "coverage-desc",
  "margin-desc",
]);

const PAGE_SIZE = 25;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "All";
  const supplier = searchParams.get("supplier") ?? "All";

  const requestedRiskLevel = searchParams.get("riskLevel") ?? "All";

  const riskLevel: "All" | RiskLevel =
    requestedRiskLevel === "All" ||
    validRiskLevels.has(requestedRiskLevel as RiskLevel)
      ? (requestedRiskLevel as "All" | RiskLevel)
      : "All";

  const requestedSort = searchParams.get("sort") ?? "risk-desc";

  const sortOption: SkuSortOption = validSortOptions.has(
    requestedSort as SkuSortOption,
  )
    ? (requestedSort as SkuSortOption)
    : "risk-desc";

  const requestedPage = Number(searchParams.get("page") ?? "1");

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const result = await getSkuExplorerPage({
    search,
    category,
    supplier,
    riskLevel,
    sortOption,
    page,
    pageSize: PAGE_SIZE,
  });

  return NextResponse.json(result);
}