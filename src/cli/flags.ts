/**
 * Parse CLI flags and return options.
 * Errors are printed to stderr; the process exits with code 1 on invalid input.
 */
export interface PipeOptions {
  /** The user's question/query */
  query: string;
  /** Watch mode: continuously read stdin */
  watch: boolean;
  /** Model override */
  model?: string;
  /** Max tokens for response */
  maxTokens: number;
  /** API key */
  apiKey?: string;
  /** API base URL (supports embedded key: https://key:sk-ant-...@host.com) */
  apiUrl?: string;
  /** Show help */
  help: boolean;
}

const HELP_TEXT = `
pipe — Pipe terminal output to AI | 终端输出 → AI 分析

USAGE / 用法:
  <command> | pipe "your question"
  pipe "your question"              (then paste input / 粘贴内容后按 Ctrl+D)
  tail -f log | pipe --watch "analyze errors"

OPTIONS / 选项:
  --watch, -w         Continuously analyze stdin as new data arrives
                      持续监听 stdin，实时分析新增内容
  --model, -m         Claude model to use (default: claude-sonnet-4-6-20250514)
                      指定 Claude 模型
  --max-tokens        Max response tokens (default: 4096)
  --api-key           API key (or set ANTHROPIC_API_KEY env var)
  --api-url           API base URL with embedded key
                      URL 格式内嵌 API Key，例如:
                      https://key:sk-ant-xxx@api.anthropic.com
                      https://key:sk-ant-xxx@api.example.com/v1
  --help, -h          Show this help / 显示帮助

EXAMPLES / 示例:
  # 环境变量
  export ANTHROPIC_API_KEY=sk-ant-...
  cat build.log | pipe "构建为什么失败了？"

  # 直接传 key
  cat build.log | pipe --api-key sk-ant-... "有什么问题？"

  # URL 内嵌 key（支持任意兼容 API）
  cat build.log | pipe --api-url https://key:sk-ant-xxx@api.anthropic.com "分析一下"

  # 实时监控
  tail -f server.log | pipe -w "发现 ERROR 立刻报告"
`;

export function parseArgs(args: string[]): PipeOptions {
  const result: PipeOptions = {
    query: "",
    watch: false,
    maxTokens: 4096,
    help: false,
  };

  const remaining: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--help":
      case "-h":
        result.help = true;
        break;
      case "--watch":
      case "-w":
        result.watch = true;
        break;
      case "--model":
      case "-m":
        result.model = args[++i];
        if (!result.model) {
          console.error("Error: --model requires a value");
          process.exit(1);
        }
        break;
      case "--max-tokens": {
        const val = args[++i];
        result.maxTokens = parseInt(val, 10);
        if (isNaN(result.maxTokens) || result.maxTokens < 1) {
          console.error("Error: --max-tokens must be a positive number");
          process.exit(1);
        }
        break;
      }
      case "--api-key": {
        result.apiKey = args[++i];
        if (!result.apiKey) {
          console.error("Error: --api-key requires a value");
          process.exit(1);
        }
        break;
      }
      case "--api-url": {
        result.apiUrl = args[++i];
        if (!result.apiUrl) {
          console.error("Error: --api-url requires a value");
          process.exit(1);
        }
        break;
      }
      default:
        if (arg.startsWith("-")) {
          console.error(`Error: Unknown flag: ${arg}\n`);
          console.error(HELP_TEXT.trim());
          process.exit(1);
        }
        remaining.push(arg);
        break;
    }
  }

  result.query = remaining.join(" ") || "";

  return result;
}

export function printHelp(): void {
  console.log(HELP_TEXT.trim());
}
