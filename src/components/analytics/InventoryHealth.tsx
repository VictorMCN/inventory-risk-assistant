import type { InventoryHealthAnalytics } from "@/lib/analytics/get-inventory-health-analytics";

type InventoryHealthProps = {
  data: InventoryHealthAnalytics;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function InventoryHealth({
  data,
}: InventoryHealthProps) {
  const topSuppliers = data.suppliers.slice(0, 5);

  return (
    <section className="mt-8">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">
          Inventory Health
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Identify capital tied in slow-moving inventory and supplier
          concentrations that deserve planner attention.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Stale Inventory
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {data.staleInventory.staleSkus.toLocaleString("en-US")}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            SKUs with no sale for at least 60 days
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Capital in Stale Stock
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(
              data.staleInventory.inventoryValue,
            )}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Inventory cost tied in stale SKUs
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            High-Margin Stale SKUs
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {data.staleInventory.highMarginStaleSkus.toLocaleString(
              "en-US",
            )}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Stale SKUs with margin above 50%
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="font-semibold text-slate-900">
            Suppliers with Most At-Risk SKUs
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Suppliers ranked by the number of High and Critical
            replenishment-risk SKUs.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">
                  Supplier
                </th>

                <th className="px-6 py-3 text-right font-semibold text-slate-600">
                  Total SKUs
                </th>

                <th className="px-6 py-3 text-right font-semibold text-slate-600">
                  At Risk
                </th>

                <th className="px-6 py-3 text-right font-semibold text-slate-600">
                  Critical
                </th>

                <th className="px-6 py-3 text-right font-semibold text-slate-600">
                  At-Risk Rate
                </th>

                <th className="px-6 py-3 text-right font-semibold text-slate-600">
                  Inventory Value
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {topSuppliers.map((supplier) => (
                <tr
                  key={supplier.supplier}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {supplier.supplier}
                  </td>

                  <td className="px-6 py-4 text-right text-slate-700">
                    {supplier.totalSkus.toLocaleString("en-US")}
                  </td>

                  <td className="px-6 py-4 text-right font-semibold text-orange-600">
                    {supplier.atRiskSkus.toLocaleString("en-US")}
                  </td>

                  <td className="px-6 py-4 text-right font-semibold text-red-600">
                    {supplier.criticalRiskSkus.toLocaleString(
                      "en-US",
                    )}
                  </td>

                  <td className="px-6 py-4 text-right text-slate-700">
                    {supplier.atRiskRatePct.toFixed(1)}%
                  </td>

                  <td className="px-6 py-4 text-right text-slate-700">
                    {formatCurrency(supplier.inventoryValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}