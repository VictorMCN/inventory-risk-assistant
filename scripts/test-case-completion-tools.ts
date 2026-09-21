import "dotenv/config";

import { executeInventoryTool } from "../src/lib/ai/inventory-tools";
import { prisma } from "../src/lib/database/prisma";

async function main() {
  console.log("Testing case-completion AI tools...");
  console.log("");

  const health =
    await executeInventoryTool(
      "get_inventory_health",
      {
        topSuppliersLimit: 5,
      },
    );

  console.log("=== INVENTORY HEALTH ===");
  console.log(
    JSON.stringify(health, null, 2),
  );

  const stale =
    await executeInventoryTool(
      "search_stale_inventory",
      {
        minDaysSinceLastSale: 60,
        minMarginPct: 50,
        sort: "margin-desc",
        limit: 5,
      },
    );

  console.log("");
  console.log(
    "=== HIGH-MARGIN STALE INVENTORY ===",
  );

  console.log(
    JSON.stringify(stale, null, 2),
  );

  console.log("");
  console.log("=== TEST PASSED ===");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);

    await prisma.$disconnect();

    process.exit(1);
  });