import { Writable } from "node:stream";

const ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY";
const ANTHROPIC_BASE_URL_ENV = "ANTHROPIC_BASE_URL";
const DEFAULT_BASE_URL = "https://api.anthropic.com";

export interface AIOptions {
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal;
  apiKey?: string;
  baseUrl?: string;
}

const DEFAULT_MODEL = "claude-sonnet-4-6-20250514";
const DEFAULT_MAX_TOKENS = 4096;

export async function analyzeWithAI(
  stdinContent: string,
  userQuery: string,
  options: AIOptions = {},
  out: Writable = process.stdout
): Promise<string> {
  let baseUrl = options.baseUrl || process.env[ANTHROPIC_BASE_URL_ENV] || DEFAULT_BASE_URL;
  let apiKey = options.apiKey || process.env[ANTHROPIC_API_KEY_ENV] || "";

  // Parse URL — may contain embedded key: https://key:sk-ant-xxx@host.com
  const parsed = parseApiUrl(baseUrl);
  if (parsed.key && !apiKey) {
    apiKey = parsed.key;
  }
  const apiUrl = parsed.url;

  if (!apiKey) {
    out.write(
      `Error: No API key provided.\n\n` +
      `Set via:\n` +
      `  1. Flag:  --api-key 你的key\n` +
      `  2. Env:   export ${ANTHROPIC_API_KEY_ENV}=你的key\n` +
      `  3. URL:   --api-url https://key:你的key@你的api地址\n\n` +
      `Get a key at: https://console.anthropic.com/\n`
    );
    process.exit(1);
  }

  const systemPrompt =
    "You are a terminal assistant. The user has piped command output to you " +
    "and is asking a question about it. Analyze the output and answer concisely. " +
    "Focus on what matters — don't summarize the entire content unless asked. " +
    "Be direct and practical.\n\n" +
    "Use markdown formatting when it helps readability — tables, code blocks, lists.\n\n" +
    "IMPORTANT: Always respond in the same language the user wrote their question in. " +
    "If they ask in Chinese, answer in Chinese. If they ask in English, answer in English. " +
    "If they ask in Japanese, answer in Japanese. Match their language.";

  const messageContent = stdinContent
    ? [
        { type: "text" as const, text: "Here is the command output:\n\n```\n" + stdinContent + "\n```" },
        { type: "text" as const, text: "\n\nMy question: " + userQuery },
      ]
    : [{ type: "text" as const, text: userQuery }];

  const body = JSON.stringify({
    model: options.model || DEFAULT_MODEL,
    max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: messageContent }],
    stream: true,
  });

  // Build final endpoint: just append /messages to the user's URL
  // User is responsible for providing the correct base path
  let endpoint = apiUrl.replace(/\/+$/, "");
  if (!endpoint.endsWith("/messages")) {
    endpoint += "/messages";
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body,
    signal: options.signal,
  });

  if (!response.ok) {
    const text = await response.text();
    out.write(`Error: API returned ${response.status}\n${text}\n`);
    process.exit(1);
  }

  const chunks: string[] = [];

  if (response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") break;

        try {
          const event = JSON.parse(data);
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            out.write(event.delta.text);
            chunks.push(event.delta.text);
          }
        } catch {
          // skip non-JSON lines
        }
      }
    }
  }

  out.write("\n");
  return chunks.join("");
}

/**
 * Parse an API URL, extracting an embedded key if present.
 * Format: https://key:your-key@your-host.com/path
 * Also accepts: https://your-host.com/path (no embedded key)
 */
function parseApiUrl(rawUrl: string): { url: string; key: string } {
  // Match: protocol://username:password@host
  const EMBEDDED_KEY = /^(https?):\/\/([^:]+):([^@]+)@(.+)$/;
  const match = rawUrl.match(EMBEDDED_KEY);

  if (match) {
    const [, protocol, , key, host] = match;
    return { url: `${protocol}://${host}`, key };
  }

  return { url: rawUrl, key: "" };
}
