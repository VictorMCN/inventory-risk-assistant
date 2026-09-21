import "dotenv/config";

import { executeInventoryTool } from "../src/lib/ai/inventory-tools";
import { prisma } from "../src/lib/database/prisma";

async function main() {
  console.log("Testing inventory AI tools...");
  console.log("");

  const summary = await executeInventoryTool(
    "get_inventory_summary",
    {},
  );

  console.log("=== INVENTORY SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));

  const criticalSkus = await executeInventoryTool(
    "search_inventory",
    {
      riskLevel: "Critical",
      sort: "risk-desc",
      limit: 3,
    },
  );

  console.log("");
  console.log("=== CRITICAL SKU SEARCH ===");
  console.log(JSON.stringify(criticalSkus, null, 2));

  const skuDetails = await executeInventoryTool(
    "get_sku_details",
    {
      skuId: "SKU-008754",
    },
  );

  console.log("");
  console.log("=== SKU DETAILS ===");
  console.log(JSON.stringify(skuDetails, null, 2));

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