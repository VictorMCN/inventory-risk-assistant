"use client";

import { useMemo, useState } from "react";

import { RiskBadge } from "@/components/inventory/RiskBadge";
import type { SkuTableRow } from "@/types/inventory-table";
import type { RiskLevel } from "@/types/risk";

type SkuTableProps = {
  rows: SkuTableRow[];
};

type SortOption =
  | "risk-desc"
  | "stock-asc"
  | "stock-desc"
  | "coverage-asc"
  | "coverage-desc"
  | "margin-desc";

const PAGE_SIZE = 25;

export function SkuTable({ rows }: SkuTableProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [supplier, setSupplier] = useState("All");
  const [riskLevel, setRiskLevel] = useState<"All" | RiskLevel>("All");
  const [sortOption, setSortOption] =
    useState<SortOption>("risk-desc");
  const [currentPage, setCurrentPage] = useState(1);

  const categories = useMemo(
    () =>
      [...new Set(rows.map((row) => row.category))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [rows],
  );

  const suppliers = useMemo(
    () =>
      [...new Set(rows.map((row) => row.supplier))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const result = rows.filter((row) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        row.skuId.toLowerCase().includes(normalizedSearch) ||
        row.skuName.toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        category === "All" || row.category === category;

      const matchesSupplier =
        supplier === "All" || row.supplier === supplier;

      const matchesRisk =
        riskLevel === "All" || row.riskLevel === riskLevel;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesSupplier &&
        matchesRisk
      );
    });

    return [...result].sort((a, b) => {
      switch (sortOption) {
        case "stock-asc":
          return a.currentStock - b.currentStock;

        case "stock-desc":
          return b.currentStock - a.currentStock;

        case "coverage-asc":
          return (
            (a.coverageDays ?? Number.POSITIVE_INFINITY) -
            (b.coverageDays ?? Number.POSITIVE_INFINITY)
          );

        case "coverage-desc":
          return (
            (b.coverageDays ?? Number.NEGATIVE_INFINITY) -
            (a.coverageDays ?? Number.NEGATIVE_INFINITY)
          );

        case "margin-desc":
          return b.marginPct - a.marginPct;

        case "risk-desc":
        default:
          if (b.riskScore !== a.riskScore) {
            return b.riskScore - a.riskScore;
          }

          return (
            (a.coverageDays ?? Number.POSITIVE_INFINITY) -
            (b.coverageDays ?? Number.POSITIVE_INFINITY)
          );
      }
    });
  }, [
    rows,
    search,
    category,
    supplier,
    riskLevel,
    sortOption,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE),
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;

  const visibleRows = filteredRows.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  function resetPage() {
    setCurrentPage(1);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">
          SKU Explorer
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Search, filter, and prioritize inventory based on replenishment
          risk.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
            placeholder="Search SKU or product..."
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />

          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              resetPage();
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="All">All categories</option>

            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={supplier}
            onChange={(event) => {
              setSupplier(event.target.value);
              resetPage();
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="All">All suppliers</option>

            {suppliers.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={riskLevel}
            onChange={(event) => {
              setRiskLevel(event.target.value as "All" | RiskLevel);
              resetPage();
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="All">All risk levels</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={sortOption}
            onChange={(event) => {
              setSortOption(event.target.value as SortOption);
              resetPage();
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="risk-desc">Highest risk first</option>
            <option value="coverage-asc">Lowest coverage first</option>
            <option value="coverage-desc">Highest coverage first</option>
            <option value="stock-asc">Lowest stock first</option>
            <option value="stock-desc">Highest stock first</option>
            <option value="margin-desc">Highest margin first</option>
          </select>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            {filteredRows.length.toLocaleString("en-US")} SKUs found
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("All");
              setSupplier("All");
              setRiskLevel("All");
              setSortOption("risk-desc");
              setCurrentPage(1);
            }}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Clear filters
          </button>
        </div>
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
            {visibleRows.map((row) => (
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

            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No SKUs match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
        <p className="text-sm text-slate-500">
          Page {safeCurrentPage} of {totalPages}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={safeCurrentPage === 1}
            onClick={() =>
              setCurrentPage((page) => Math.max(1, page - 1))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={safeCurrentPage === totalPages}
            onClick={() =>
              setCurrentPage((page) =>
                Math.min(totalPages, page + 1),
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}