"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { AssistantHistoryMessage } from "@/types/assistant";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const suggestedQuestions = [
  "How many critical SKUs are currently in the inventory?",
  "Show me the 3 highest-risk FOOD products.",
  "Why is SKU-008754 considered critical?",
];

type MarkdownMessageProps = {
  content: string;
};

function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-3 last:mb-0">{children}</p>
        ),

        strong: ({ children }) => (
          <strong className="font-semibold text-inherit">
            {children}
          </strong>
        ),

        ul: ({ children }) => (
          <ul className="my-3 list-disc space-y-1 pl-5">
            {children}
          </ul>
        ),

        ol: ({ children }) => (
          <ol className="my-3 list-decimal space-y-1 pl-5">
            {children}
          </ol>
        ),

        li: ({ children }) => (
          <li className="pl-1">{children}</li>
        ),

        h1: ({ children }) => (
          <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">
            {children}
          </h3>
        ),

        h2: ({ children }) => (
          <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">
            {children}
          </h3>
        ),

        h3: ({ children }) => (
          <h3 className="mb-2 mt-4 font-semibold first:mt-0">
            {children}
          </h3>
        ),

        code: ({ children }) => (
          <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs text-slate-800">
            {children}
          </code>
        ),

        hr: () => (
          <hr className="my-4 border-slate-200" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function InventoryAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Ask me about inventory risk, replenishment priorities, categories, suppliers, or specific SKUs.",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [nextId, setNextId] = useState(2);

  const conversationEndRef = useRef<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isLoading]);

  async function sendMessage(message: string) {
    const normalizedMessage = message.trim();

    if (!normalizedMessage || isLoading) {
      return;
    }

    const history: AssistantHistoryMessage[] = messages
      .filter((chatMessage) => chatMessage.id !== 1)
      .slice(-10)
      .map((chatMessage) => ({
        role: chatMessage.role,
        content: chatMessage.content,
      }));

    const userMessageId = nextId;
    const assistantMessageId = nextId + 1;

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: normalizedMessage,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setNextId((current) => current + 2);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          message: normalizedMessage,
          history,
        }),
      });

      const data = (await response.json()) as {
        answer?: string;
        error?: string;
      };

      if (!response.ok || !data.answer) {
        throw new Error(
          data.error ??
            "Unable to retrieve an assistant response.",
        );
      }

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: data.answer,
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch {
      const errorMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content:
          "The inventory assistant is temporarily unavailable. Please try again.",
      };

      setMessages((current) => [
        ...current,
        errorMessage,
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    await sendMessage(input);
  }

  return (
    <section className="mt-8">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                AI Decision Support
              </p>

              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Inventory Assistant
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Ask questions about replenishment risk,
                inventory exposure, suppliers, categories, or
                individual SKUs using the current inventory
                snapshot.
              </p>
            </div>

            <div className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 sm:block">
              Read-only
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_260px]">
          <div className="flex min-h-[480px] flex-col">
            <div className="max-h-[620px] flex-1 space-y-4 overflow-y-auto p-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 px-4 py-3 text-sm leading-6 text-white"
                        : "max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700"
                    }
                  >
                    {message.role === "assistant" ? (
                      <MarkdownMessage
                        content={message.content}
                      />
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />

                      <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />

                      <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />

                      <span className="ml-1 text-sm text-slate-500">
                        Analyzing inventory...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={conversationEndRef} />
            </div>

            <form
              onSubmit={handleSubmit}
              className="border-t border-slate-200 p-4"
            >
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  disabled={isLoading}
                  maxLength={2000}
                  onChange={(event) => {
                    setInput(event.target.value);
                  }}
                  placeholder="Ask about inventory risk..."
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 disabled:bg-slate-50"
                />

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    input.trim().length === 0
                  }
                  className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Send
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                AI responses are decision support based on the
                2026-03-31 inventory snapshot.
              </p>
            </form>
          </div>

          <aside className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
            <p className="text-sm font-semibold text-slate-700">
              Try asking
            </p>

            <div className="mt-3 space-y-2">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    void sendMessage(question);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-left text-sm leading-5 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Data access
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                The assistant can read validated inventory
                summaries, search prioritized SKUs, and inspect
                individual SKU risk details.
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                It cannot modify inventory or place replenishment
                orders.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}