export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type InventoryHealthFlag = "STALE_INVENTORY";

export type RiskAssessment = {
  score: number;
  level: RiskLevel;
  coverageDays: number | null;
  coverageRatio: number | null;
  reasons: string[];
  healthFlags: InventoryHealthFlag[];
};