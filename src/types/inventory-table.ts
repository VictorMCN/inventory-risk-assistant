import type { RiskLevel } from "@/types/risk";

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