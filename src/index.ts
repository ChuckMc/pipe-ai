#!/usr/bin/env node

import { analyzeWithAI } from "./ai/client.js";
import { parseArgs, printHelp } from "./cli/flags.js";
import { startWatching } from "./stream/watcher.js";
import { stdin as input } from "node:process";

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    input.setEncoding("utf-8");

    input.on("data", (chunk: string) => chunks.push(Buffer.from(chunk)));
    input.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    input.on("error", reject);
  });
}

function isPiped(): boolean {
  return !input.isTTY;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (!options.query) {
    console.error("Error: No question provided.\n");
    printHelp();
    process.exit(1);
  }

  const aiOptions = {
    model: options.model,
    maxTokens: options.maxTokens,
    apiKey: options.apiKey,
    baseUrl: options.apiUrl,
  };

  if (options.watch) {
    console.error("pipe: watching stdin... (Ctrl+C to stop)\n");
    await startWatching(input, {
      onData: async (chunk) => {
        console.error(`\npipe: analyzing ${chunk.length} chars...\n`);
        await analyzeWithAI(chunk, options.query, aiOptions);
        console.error("\n---\n");
      },
      onError: (err) => {
        console.error("pipe: stdin error:", err.message);
      },
    });
    return;
  }

  const stdinContent = isPiped() ? await readStdin() : await (() => {
    console.error("pipe: Paste your content, then press Ctrl+D when done.\n");
    return readStdin();
  })();

  await analyzeWithAI(stdinContent, options.query, aiOptions);
}

main().catch((err) => {
  console.error("pipe: Unexpected error:", err.message);
  process.exit(1);
});
