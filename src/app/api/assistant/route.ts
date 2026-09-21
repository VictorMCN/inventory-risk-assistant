import { NextRequest, NextResponse } from "next/server";

import { askInventoryAssistant } from "@/lib/ai/inventory-assistant";
import type { AssistantHistoryMessage } from "@/types/assistant";

const MAX_MESSAGE_LENGTH = 2_000;
const MAX_HISTORY_MESSAGES = 10;

function isHistoryMessage(
  value: unknown,
): value is AssistantHistoryMessage {
  if (
    typeof value !== "object" ||
    value === null ||
    !("role" in value) ||
    !("content" in value)
  ) {
    return false;
  }

  return (
    (value.role === "user" ||
      value.role === "assistant") &&
    typeof value.content === "string" &&
    value.content.trim().length > 0 &&
    value.content.length <= MAX_MESSAGE_LENGTH
  );
}

function isValidHistory(
  history: unknown,
): history is AssistantHistoryMessage[] {
  if (!Array.isArray(history)) {
    return false;
  }

  if (history.length > MAX_HISTORY_MESSAGES) {
    return false;
  }

  if (!history.every(isHistoryMessage)) {
    return false;
  }

  for (
    let index = 0;
    index < history.length;
    index += 1
  ) {
    const expectedRole =
      index % 2 === 0
        ? "user"
        : "assistant";

    if (
      history[index].role !== expectedRole
    ) {
      return false;
    }
  }

  return true;
}

export async function POST(
  request: NextRequest,
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON request.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("message" in body) ||
    typeof body.message !== "string"
  ) {
    return NextResponse.json(
      {
        error: "A message is required.",
      },
      {
        status: 400,
      },
    );
  }

  const message = body.message.trim();

  if (!message) {
    return NextResponse.json(
      {
        error: "A message is required.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    message.length >
    MAX_MESSAGE_LENGTH
  ) {
    return NextResponse.json(
      {
        error: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
      },
      {
        status: 400,
      },
    );
  }

  const history =
    "history" in body &&
    body.history !== undefined
      ? body.history
      : [];

  if (!isValidHistory(history)) {
    return NextResponse.json(
      {
        error:
          "Invalid conversation history.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const answer =
      await askInventoryAssistant(
        message,
        history,
      );

    return NextResponse.json({
      answer,
    });
  } catch (error) {
    console.error(
      "Inventory assistant request failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "The inventory assistant is temporarily unavailable. Please try again.",
      },
      {
        status: 503,
      },
    );
  }
}