import {
  GoogleGenAI,
  ThinkingLevel,
  type Content,
  type Part,
} from "@google/genai";

import {
  executeInventoryTool,
  inventoryToolDeclarations,
} from "@/lib/ai/inventory-tools";
import type { AssistantHistoryMessage } from "@/types/assistant";

const PRIMARY_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODEL = "gemini-3.6-flash";

const MAX_TOOL_ROUNDS = 4;
const MAX_HISTORY_MESSAGES = 10;

const SYSTEM_INSTRUCTION = `
You are an AI inventory planning assistant.

You help inventory planners investigate stockout risk, replenishment priorities,
inventory exposure, suppliers, categories, and individual SKUs.

Important rules:

- The inventory snapshot date is 2026-03-31.
- Always respond in the same language used by the user.
- If the user writes in Brazilian Portuguese, respond in Brazilian Portuguese.
- If the user writes in English, respond in English.
- Preserve SKU IDs, product names, supplier names, category names, and
  technical values exactly as returned by the inventory tools.
- Use the provided inventory tools whenever the user asks a factual question
  about inventory data.
- Never invent SKU data, counts, suppliers, categories, risk scores,
  inventory values, lost sales, revenue impact, safety stock, demand periods,
  or replenishment facts.
- Do not infer that sales were actually lost unless the available data
  explicitly establishes that fact.
- Do not describe a period as "peak demand" unless the available data
  explicitly establishes that fact.
- A reorder point is a replenishment trigger in this dataset. Do not
  automatically describe it as safety stock.
- If the requested information is unavailable from the tools, say so clearly.
- When discussing specific products, mention both SKU ID and product name
  when available.
- Explain risk using only the signals returned by the tools.
- When explaining why a SKU received its risk score, treat the "risk.reasons"
  returned by get_sku_details as the authoritative scoring reasons.
- Other SKU fields such as coverage, reorder point, reorder quantity, margin,
  lead time, stock level, or supplier may be presented as supporting context,
  but must not be described as causes of the risk score unless they appear in
  "risk.reasons".
- Clearly distinguish scoring reasons from supporting inventory context.
- Distinguish stockout risk from business impact.
- High margin does not automatically mean high stockout risk.
- Recommendations must be phrased as decision support, not as actions already
  taken.
- Keep answers concise, practical, and oriented toward inventory decisions.
- These tools are read-only.
`;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({
    apiKey,
  });
}

function getErrorStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  if (error instanceof Error) {
    const match = error.message.match(/"code"\s*:\s*(\d{3})/);

    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

function shouldTryFallback(error: unknown): boolean {
  const status = getErrorStatus(error);

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function buildGeminiHistory(
  history: AssistantHistoryMessage[],
): Content[] {
  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [
        {
          text: message.content,
        },
      ],
    }));
}

async function runAssistantWithModel(
  message: string,
  model: string,
  history: AssistantHistoryMessage[],
): Promise<string> {
  const ai = getGeminiClient();

  const chat = ai.chats.create({
    model,

    history: buildGeminiHistory(history),

    config: {
      systemInstruction: SYSTEM_INSTRUCTION,

      tools: [
        {
          functionDeclarations: inventoryToolDeclarations,
        },
      ],

      thinkingConfig: {
        thinkingLevel: ThinkingLevel.MINIMAL,
      },

      maxOutputTokens: 512,

      httpOptions: {
        timeout: 25_000,
      },
    },
  });

  let response = await chat.sendMessage({
    message,
  });

  for (
    let round = 0;
    round < MAX_TOOL_ROUNDS;
    round += 1
  ) {
    const functionCalls = response.functionCalls ?? [];

    if (functionCalls.length === 0) {
      const text = response.text?.trim();

      if (!text) {
        throw new Error(
          "Gemini returned neither text nor a function call.",
        );
      }

      return text;
    }

    const functionResponseParts: Part[] = await Promise.all(
      functionCalls.map(async (functionCall) => {
        const toolName = functionCall.name;

        if (!toolName) {
          throw new Error(
            "Gemini returned a function call without a name.",
          );
        }

        const args =
          (functionCall.args as Record<string, unknown> | undefined) ??
          {};

        const output = await executeInventoryTool(
          toolName,
          args,
        );

        return {
          functionResponse: {
            id: functionCall.id,
            name: toolName,
            response: {
              output,
            },
          },
        };
      }),
    );

    response = await chat.sendMessage({
      message: functionResponseParts,
    });
  }

  throw new Error(
    "Inventory assistant exceeded the maximum number of tool rounds.",
  );
}

export async function askInventoryAssistant(
  message: string,
  history: AssistantHistoryMessage[] = [],
): Promise<string> {
  const normalizedMessage = message.trim();

  if (!normalizedMessage) {
    throw new Error("A message is required.");
  }

  try {
    return await runAssistantWithModel(
      normalizedMessage,
      PRIMARY_MODEL,
      history,
    );
  } catch (error) {
    if (!shouldTryFallback(error)) {
      throw error;
    }

    console.warn(
      `Primary Gemini model unavailable. Falling back to ${FALLBACK_MODEL}.`,
    );

    return runAssistantWithModel(
      normalizedMessage,
      FALLBACK_MODEL,
      history,
    );
  }
}