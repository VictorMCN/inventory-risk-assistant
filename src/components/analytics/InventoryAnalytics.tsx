"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { InventoryAnalytics as InventoryAnalyticsData } from "@/lib/analytics/get-inventory-analytics";

type InventoryAnalyticsProps = {
  data: InventoryAnalyticsData;
};

const riskColors = {
  Low: "#10b981",
  Medium: "#f59e0b",
  High: "#f97316",
  Critical: "#ef4444",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function InventoryAnalytics({
  data,
}: InventoryAnalyticsProps) {
  const inventoryValueData = [...data.categories].sort(
    (a, b) => b.inventoryValue - a.inventoryValue,
  );

  const atRiskData = [...data.categories].sort(
    (a, b) => b.atRiskSkus - a.atRiskSkus,
  );

  return (
    <section className="mt-8">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">
          Inventory Analytics
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Understand inventory exposure, capital allocation, and replenishment
          risk across the portfolio.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900">
              Risk Distribution
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Number of SKUs in each replenishment risk level.
            </p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.riskDistribution}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="level"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />

                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  formatter={(value) => [
                    Number(value).toLocaleString("en-US"),
                    "SKUs",
                  ]}
                />

                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                >
                  {data.riskDistribution.map((item) => (
                    <Cell
                      key={item.level}
                      fill={riskColors[item.level]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900">
              Inventory Value by Category
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Capital invested in current inventory by product category.
            </p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={inventoryValueData}
                layout="vertical"
                margin={{
                  left: 20,
                  right: 20,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={formatCurrency}
                />

                <YAxis
                  type="category"
                  dataKey="category"
                  width={100}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />

                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Inventory Value",
                  ]}
                />

                <Bar
                  dataKey="inventoryValue"
                  fill="#334155"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900">
              At-Risk SKUs by Category
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              High and critical replenishment risk concentration by category.
            </p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={atRiskData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="category"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />

                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  formatter={(value) => [
                    Number(value).toLocaleString("en-US"),
                    "At-Risk SKUs",
                  ]}
                />

                <Bar
                  dataKey="atRiskSkus"
                  fill="#f97316"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}