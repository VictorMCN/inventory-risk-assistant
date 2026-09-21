import type { RiskLevel } from "@/types/risk";

export type SkuSortOption =
  | "risk-desc"
  | "stock-asc"
  | "stock-desc"
  | "coverage-asc"
  | "coverage-desc"
  | "margin-desc";

export type SkuTableRow = {
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
};

export type SkuExplorerQuery = {
  search: string;
  category: string;
  supplier: string;
  riskLevel: "All" | RiskLevel;
  sortOption: SkuSortOption;
  page: number;
  pageSize: number;
};

export type SkuExplorerResult = {
  rows: SkuTableRow[];
  totalCount: number;
  totalPages: number;
  page: number;
};