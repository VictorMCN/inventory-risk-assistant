import Image from "next/image";

import { InventoryAnalytics } from "@/components/analytics/InventoryAnalytics";
import { InventoryHealth } from "@/components/analytics/InventoryHealth";
import { InventoryAssistant } from "@/components/assistant/InventoryAssistant";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SkuTable } from "@/components/inventory/SkuTable";
import { getDashboardMetrics } from "@/lib/analytics/get-dashboard-metrics";
import { getInventoryAnalytics } from "@/lib/analytics/get-inventory-analytics";
import { getInventoryHealthAnalytics } from "@/lib/analytics/get-inventory-health-analytics";
import {
  getSkuExplorerPage,
  getSkuFilterOptions,
} from "@/lib/data/get-sku-explorer-page";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [
    metrics,
    analytics,
    healthAnalytics,
    initialExplorerResult,
    filterOptions,
  ] = await Promise.all([
    getDashboardMetrics(),
    getInventoryAnalytics(),
    getInventoryHealthAnalytics(),

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
  } = metrics;

  const formattedInventoryValue =
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(inventoryValue);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <Image
                src="/ira-logo.png"
                alt="IRA — Inventory Risk Assistant"
                width={300}
                height={100}
                priority
                className="h-auto w-[240px] sm:w-[300px]"
              />

              <h1 className="sr-only">
                IRA — Inventory Risk Assistant
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Identify stockout risks, prioritize replenishment decisions,
                and understand inventory health through actionable data and
                AI-assisted analysis.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                Inventory Intelligence
              </span>

              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                AI Decision Support
              </span>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
                Snapshot · Mar 31, 2026
              </span>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

        <InventoryAnalytics data={analytics} />

        <InventoryHealth data={healthAnalytics} />

        <InventoryAssistant />

        <section className="mt-8">
          <SkuTable
            initialResult={initialExplorerResult}
            categories={filterOptions.categories}
            suppliers={filterOptions.suppliers}
          />
        </section>

        <footer className="mt-10 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          IRA · Inventory Risk Assistant · Inventory snapshot 2026-03-31
        </footer>
      </div>
    </main>
  );
}