import { RiskBadge } from "@/components/inventory/RiskBadge";
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

type SkuTableProps = {
  rows: SkuTableRow[];
};

export function SkuTable({ rows }: SkuTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Priority SKUs
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          SKUs with the highest replenishment risk based on the current risk
          model.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-slate-600">
                SKU
              </th>
              <th className="px-6 py-3 text-left font-semibold text-slate-600">
                Product
              </th>
              <th className="px-6 py-3 text-left font-semibold text-slate-600">
                Category
              </th>
              <th className="px-6 py-3 text-left font-semibold text-slate-600">
                Supplier
              </th>
              <th className="px-6 py-3 text-right font-semibold text-slate-600">
                Stock
              </th>
              <th className="px-6 py-3 text-right font-semibold text-slate-600">
                Coverage
              </th>
              <th className="px-6 py-3 text-right font-semibold text-slate-600">
                Lead Time
              </th>
              <th className="px-6 py-3 text-right font-semibold text-slate-600">
                Margin
              </th>
              <th className="px-6 py-3 text-right font-semibold text-slate-600">
                Score
              </th>
              <th className="px-6 py-3 text-left font-semibold text-slate-600">
                Risk
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={row.skuId}
                className="transition-colors hover:bg-slate-50"
              >
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500">
                  {row.skuId}
                </td>

                <td className="px-6 py-4 font-medium text-slate-900">
                  {row.skuName}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                  {row.category}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                  {row.supplier}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-right text-slate-700">
                  {row.currentStock.toLocaleString("en-US")}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-right text-slate-700">
                  {row.coverageDays === null
                    ? "N/A"
                    : `${row.coverageDays.toFixed(1)} d`}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-right text-slate-700">
                  {row.leadTimeDays} d
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-right text-slate-700">
                  {row.marginPct.toFixed(1)}%
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-slate-900">
                  {row.riskScore}
                </td>

                <td className="whitespace-nowrap px-6 py-4">
                  <RiskBadge level={row.riskLevel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}