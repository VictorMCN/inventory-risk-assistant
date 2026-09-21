import "dotenv/config";

import { askInventoryAssistant } from "../src/lib/ai/inventory-assistant";
import { prisma } from "../src/lib/database/prisma";

async function ask(question: string) {
  console.log("");
  console.log("USER:");
  console.log(question);

  console.log("");
  console.log("ASSISTANT:");

  const answer = await askInventoryAssistant(question);

  console.log(answer);
  console.log("");
  console.log("----------------------------------------");
}

async function main() {
  console.log("Testing AI Inventory Assistant...");

  await ask(
    "How many SKUs are currently critical and how many are at risk overall?",
  );

  await ask(
    "Show me the 3 highest-risk FOOD products.",
  );

  await ask(
    "Why is SKU-008754 considered critical?",
  );

  console.log("");
  console.log("=== AI ASSISTANT TEST PASSED ===");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("");
    console.error("AI assistant test failed.");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    await prisma.$disconnect();

    process.exit(1);
  });