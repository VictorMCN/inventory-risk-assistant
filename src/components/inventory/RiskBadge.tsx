import type { RiskLevel } from "@/types/risk";

type RiskBadgeProps = {
  level: RiskLevel;
};

const styles: Record<RiskLevel, string> = {
  Low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  High: "bg-orange-50 text-orange-700 ring-orange-600/20",
  Critical: "bg-red-50 text-red-700 ring-red-600/20",
};

export function RiskBadge({ level }: RiskBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[level]}`}
    >
      {level}
    </span>
  );
}