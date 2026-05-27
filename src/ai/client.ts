import { Writable } from "node:stream";

const ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY";
const ANTHROPIC_BASE_URL_ENV = "ANTHROPIC_BASE_URL";
const ANTHROPIC_MODEL_ENV = "ANTHROPIC_MODEL";
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

/**
 * Resolve the model to use:
 * - If user specified --model, use it directly
 * - Otherwise, try to fetch available models from the API and pick the first one
 * - If fetch fails (e.g. Anthropic native has no /models endpoint), fall back to default
 */
async function resolveModel(
  endpoint: string,
  apiKey: string,
  userModel: string | undefined,
  signal?: AbortSignal
): Promise<string> {
  // Priority: --model flag > ANTHROPIC_MODEL env > auto-detect > default
  if (userModel) return userModel;
  const envModel = process.env[ANTHROPIC_MODEL_ENV];
  if (envModel) return envModel;

  // Try to discover models from the API
  try {
    // Try both /models and /v1/models
    const base = endpoint.replace(/\/messages\/?$/, "").replace(/\/+$/, "");
    const modelsUrl = base.includes("/v1") ? base + "/models" : base + "/v1/models";
    const res = await fetch(modelsUrl, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "x-api-key": apiKey,
      },
      signal,
    });
    if (res.ok) {
      const data = await res.json() as any;
      const models: any[] = data?.data || data?.models || [];
      if (models.length > 0) {
        // Pick the first available model
        const model = models[0].id;
        console.error(`pipe: auto-selected model: ${model} (use --model to specify)`);
        return model;
      }
    }
  } catch {
    // ignore — fall back to default
  }

  console.error(`pipe: using default model: ${DEFAULT_MODEL} (use --model to specify)`);
  return DEFAULT_MODEL;
}

/**
 * List available models from the API
 */
export async function listModels(
  baseUrl: string,
  apiKey: string,
  out: Writable = process.stdout
): Promise<void> {
  const parsed = parseApiUrl(baseUrl);
  const key = parsed.key || apiKey;
  const url = parsed.url;

  if (!key) {
    out.write("Error: No API key provided. Use --api-key or --api-url.\n");
    process.exit(1);
  }

  let endpoint = url.replace(/\/+$/, "");
  if (!endpoint.includes("api.anthropic.com") && !endpoint.endsWith("/v1") && !endpoint.endsWith("/messages")) {
    endpoint += "/v1";
  }
  if (!endpoint.endsWith("/messages")) {
    endpoint += "/messages";
  }
  const modelsUrl = endpoint.replace(/\/messages\/?$/, "").replace(/\/+$/, "") + "/models";

  try {
    const res = await fetch(modelsUrl, {
      headers: {
        "Authorization": `Bearer ${key}`,
        "x-api-key": key,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      out.write(`Error: API returned ${res.status}\n${text}\n`);
      out.write("\n该 API 不支持 /models 接口，请通过 --model 手动指定模型名。\n");
      process.exit(1);
    }
    const data = await res.json() as any;
    const models: any[] = data?.data || data?.models || [];
    if (models.length === 0) {
      out.write("未找到可用模型。该 API 可能不支持 /models 接口。\n");
      out.write("请通过 --model 手动指定模型名。\n");
      return;
    }
    out.write(`可用模型 (${models.length}):\n\n`);
    for (const m of models) {
      out.write(`  ${m.id}\n`);
    }
    out.write(`\n使用方法:\n  pipe --model ${models[0].id} "你的问题"\n`);
  } catch (err: any) {
    out.write(`Error: ${err.message}\n`);
    process.exit(1);
  }
}

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

  // Build final endpoint
  let endpoint = apiUrl.replace(/\/+$/, "");
  // Ensure /v1 prefix for third-party APIs (Anthropic native uses api.anthropic.com directly)
  if (!endpoint.includes("api.anthropic.com") && !endpoint.endsWith("/v1") && !endpoint.endsWith("/messages")) {
    endpoint += "/v1";
  }
  if (!endpoint.endsWith("/messages")) {
    endpoint += "/messages";
  }

  // Resolve model
  const model = await resolveModel(endpoint, apiKey, options.model, options.signal);

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
    model,
    max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: messageContent }],
    stream: true,
  });

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
    // If model not found, suggest --list-models
    if (text.includes("model_not_found") || text.includes("model")) {
      out.write(`\n提示: 使用 --list-models 查看可用模型，或用 --model 指定模型名。\n`);
    }
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
  const EMBEDDED_KEY = /^(https?):\/\/([^:]+):([^@]+)@(.+)$/;
  const match = rawUrl.match(EMBEDDED_KEY);

  if (match) {
    const [, protocol, , key, host] = match;
    return { url: `${protocol}://${host}`, key };
  }

  return { url: rawUrl, key: "" };
}
