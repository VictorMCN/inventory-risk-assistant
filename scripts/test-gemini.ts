import "dotenv/config";

import {
  GoogleGenAI,
  ThinkingLevel,
} from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured.");
}

const ai = new GoogleGenAI({
  apiKey,
});

async function main() {
  console.log("Testing Gemini connection...");

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents:
      "Reply with exactly this sentence: Gemini connection successful.",
    config: {
      maxOutputTokens: 128,

      thinkingConfig: {
        thinkingLevel: ThinkingLevel.MINIMAL,
      },

      httpOptions: {
        timeout: 20_000,
      },
    },
  });

  console.log(response.text);
}

main().catch((error) => {
  console.error("");
  console.error("Gemini test failed.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exit(1);
});