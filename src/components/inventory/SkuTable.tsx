"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { RiskBadge } from "@/components/inventory/RiskBadge";
import type {
  SkuExplorerResult,
  SkuSortOption,
} from "@/types/inventory-table";
import type { RiskLevel } from "@/types/risk";

type SkuTableProps = {
  initialResult: SkuExplorerResult;
  categories: string[];
  suppliers: string[];
};

export function SkuTable({
  initialResult,
  categories,
  suppliers,
}: SkuTableProps) {
  const [search, setSearch] =
    useState("");

  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState("");

  const [category, setCategory] =
    useState("All");

  const [supplier, setSupplier] =
    useState("All");

  const [riskLevel, setRiskLevel] =
    useState<"All" | RiskLevel>("All");

  const [maxStock, setMaxStock] =
    useState("");

  const [
    maxCoverageDays,
    setMaxCoverageDays,
  ] = useState("");

  const [
    minMarginPct,
    setMinMarginPct,
  ] = useState("");

  const [sortOption, setSortOption] =
    useState<SkuSortOption>(
      "risk-desc",
    );

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [result, setResult] =
    useState<SkuExplorerResult>(
      initialResult,
    );

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const isFirstRequest = useRef(true);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        setDebouncedSearch(search);
        setCurrentPage(1);
      },
      300,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    if (isFirstRequest.current) {
      isFirstRequest.current = false;
      return;
    }

    const controller =
      new AbortController();

    async function loadSkus() {
      setIsLoading(true);
      setError(null);

      const params =
        new URLSearchParams({
          search: debouncedSearch,
          category,
          supplier,
          riskLevel,
          sort: sortOption,
          page: currentPage.toString(),
        });

      if (maxStock.trim()) {
        params.set(
          "maxStock",
          maxStock.trim(),
        );
      }

      if (maxCoverageDays.trim()) {
        params.set(
          "maxCoverageDays",
          maxCoverageDays.trim(),
        );
      }

      if (minMarginPct.trim()) {
        params.set(
          "minMarginPct",
          minMarginPct.trim(),
        );
      }

      try {
        const response = await fetch(
          `/api/skus?${params.toString()}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load SKU data.",
          );
        }

        const data =
          (await response.json()) as SkuExplorerResult;

        setResult(data);
      } catch (requestError) {
        if (
          requestError instanceof
            DOMException &&
          requestError.name ===
            "AbortError"
        ) {
          return;
        }

        setError(
          "Unable to load inventory data. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadSkus();

    return () => {
      controller.abort();
    };
  }, [
    debouncedSearch,
    category,
    supplier,
    riskLevel,
    maxStock,
    maxCoverageDays,
    minMarginPct,
    sortOption,
    currentPage,
  ]);

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");

    setCategory("All");
    setSupplier("All");
    setRiskLevel("All");

    setMaxStock("");
    setMaxCoverageDays("");
    setMinMarginPct("");

    setSortOption("risk-desc");
    setCurrentPage(1);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">
          SKU Explorer
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Search, filter, and prioritize inventory based on
          replenishment risk.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(
                event.target.value,
              );
            }}
            placeholder="Search SKU or product..."
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />

          <select
            value={category}
            onChange={(event) => {
              setCategory(
                event.target.value,
              );

              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="All">
              All categories
            </option>

            {categories.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          <select
            value={supplier}
            onChange={(event) => {
              setSupplier(
                event.target.value,
              );

              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="All">
              All suppliers
            </option>

            {suppliers.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          <select
            value={riskLevel}
            onChange={(event) => {
              setRiskLevel(
                event.target.value as
                  | "All"
                  | RiskLevel,
              );

              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="All">
              All risk levels
            </option>

            <option value="Critical">
              Critical
            </option>

            <option value="High">
              High
            </option>

            <option value="Medium">
              Medium
            </option>

            <option value="Low">
              Low
            </option>
          </select>

          <select
            value={sortOption}
            onChange={(event) => {
              setSortOption(
                event.target
                  .value as SkuSortOption,
              );

              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="risk-desc">
              Highest risk first
            </option>

            <option value="coverage-asc">
              Lowest coverage first
            </option>

            <option value="coverage-desc">
              Highest coverage first
            </option>

            <option value="stock-asc">
              Lowest stock first
            </option>

            <option value="stock-desc">
              Highest stock first
            </option>

            <option value="margin-desc">
              Highest margin first
            </option>
          </select>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Maximum stock
            </span>

            <input
              type="number"
              min="0"
              step="1"
              value={maxStock}
              onChange={(event) => {
                setMaxStock(
                  event.target.value,
                );

                setCurrentPage(1);
              }}
              placeholder="e.g. 50"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Maximum coverage days
            </span>

            <input
              type="number"
              min="0"
              step="0.1"
              value={maxCoverageDays}
              onChange={(event) => {
                setMaxCoverageDays(
                  event.target.value,
                );

                setCurrentPage(1);
              }}
              placeholder="e.g. 7"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Minimum margin %
            </span>

            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={minMarginPct}
              onChange={(event) => {
                setMinMarginPct(
                  event.target.value,
                );

                setCurrentPage(1);
              }}
              placeholder="e.g. 40"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">
              {result.totalCount.toLocaleString(
                "en-US",
              )}{" "}
              SKUs found
            </p>

            {isLoading && (
              <span className="text-xs font-medium text-slate-400">
                Updating...
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Clear filters
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div
        className={`overflow-x-auto transition-opacity ${
          isLoading
            ? "opacity-60"
            : "opacity-100"
        }`}
      >
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
            {result.rows.map((row) => (
              <tr
                key={row.skuId}
                className={
                  row.riskLevel ===
                  "Critical"
                    ? "bg-red-50/60 transition-colors hover:bg-red-50"
                    : row.riskLevel ===
                        "High"
                      ? "bg-amber-50/50 transition-colors hover:bg-amber-50"
                      : "transition-colors hover:bg-slate-50"
                }
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
                  {row.currentStock.toLocaleString(
                    "en-US",
                  )}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-right text-slate-700">
                  {row.coverageDays ===
                  null
                    ? "N/A"
                    : `${row.coverageDays.toFixed(
                        1,
                      )} d`}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-right text-slate-700">
                  {row.leadTimeDays} d
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-right text-slate-700">
                  {row.marginPct.toFixed(
                    1,
                  )}
                  %
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-slate-900">
                  {row.riskScore}
                </td>

                <td className="whitespace-nowrap px-6 py-4">
                  <RiskBadge
                    level={row.riskLevel}
                  />
                </td>
              </tr>
            ))}

            {result.rows.length ===
              0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No SKUs match the
                  selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
        <p className="text-sm text-slate-500">
          Page {currentPage} of{" "}
          {result.totalPages}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={
              currentPage === 1 ||
              isLoading
            }
            onClick={() => {
              setCurrentPage(
                (page) =>
                  Math.max(
                    1,
                    page - 1,
                  ),
              );
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={
              currentPage >=
                result.totalPages ||
              isLoading ||
              result.totalCount === 0
            }
            onClick={() => {
              setCurrentPage(
                (page) =>
                  Math.min(
                    result.totalPages,
                    page + 1,
                  ),
              );
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}