-- CreateTable
CREATE TABLE "skus" (
    "sku_id" VARCHAR(32) NOT NULL,
    "sku_name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "supplier" VARCHAR(255) NOT NULL,
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "current_stock" INTEGER NOT NULL,
    "reorder_point" INTEGER NOT NULL,
    "reorder_qty" INTEGER NOT NULL,
    "lead_time_days" INTEGER NOT NULL,
    "daily_sales_30d_avg" DECIMAL(12,4) NOT NULL,
    "daily_sales_90d_avg" DECIMAL(12,4) NOT NULL,
    "last_sale_date" DATE,
    "last_reorder_date" DATE,
    "stockout_days_last_90d" INTEGER NOT NULL,
    "seasonal_index" DECIMAL(4,2) NOT NULL,
    "margin_pct" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "skus_pkey" PRIMARY KEY ("sku_id")
);

-- CreateIndex
CREATE INDEX "skus_category_idx" ON "skus"("category");

-- CreateIndex
CREATE INDEX "skus_supplier_idx" ON "skus"("supplier");
