import { MetricCard } from "@/components/dashboard/MetricCard";
import { SkuTable } from "@/components/inventory/SkuTable";
import { calculateInventoryMetrics } from "@/lib/analytics/inventory-metrics";
import {
  getSkuExplorerPage,
  getSkuFilterOptions,
} from "@/lib/data/get-sku-explorer-page";
import { getSkusFromDatabase } from "@/lib/data/get-skus-from-database";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [skus, initialExplorerResult, filterOptions] = await Promise.all([
    getSkusFromDatabase(),

    getSkuExplorerPage({
      search: "",
      category: "All",
      supplier: "All",
      riskLevel: "All",
      sortOption: "risk-desc",
      page: 1,
      pageSize: 25,
    }),

    getSkuFilterOptions(),
  ]);

  const {
    totalSkus,
    criticalRiskSkus,
    atRiskSkus,
    inventoryValue,
  } = calculateInventoryMetrics(skus);

  const formattedInventoryValue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(inventoryValue);

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-medium text-slate-500">
            Inventory Intelligence Platform
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Inventory Risk Assistant
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            Identify stockout risks, prioritize replenishment decisions, and
            understand inventory health through actionable data.
          </p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total SKUs"
            value={totalSkus.toLocaleString("en-US")}
            description="SKUs in the current inventory snapshot"
          />

          <MetricCard
            title="Critical Risk"
            value={criticalRiskSkus.toLocaleString("en-US")}
            description="SKUs requiring immediate replenishment attention"
          />

          <MetricCard
            title="At Risk"
            value={atRiskSkus.toLocaleString("en-US")}
            description="High and critical stockout risk SKUs"
          />

          <MetricCard
            title="Inventory Value"
            value={formattedInventoryValue}
            description="Capital invested in current stock"
          />
        </section>

        <section className="mt-8">
          <SkuTable
            initialResult={initialExplorerResult}
            categories={filterOptions.categories}
            suppliers={filterOptions.suppliers}
          />
        </section>
      </div>
    </main>
  );
}