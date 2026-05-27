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
  /** List available models and exit */
  listModels: boolean;
  /** Show help */
  help: boolean;
}

const HELP_TEXT = `
pipe — 终端输出 → AI 分析，一个管道命令问任何问题

USAGE / 用法:
  <command> | pipe "你的问题"
  pipe "你的问题"                   (粘贴内容后按 Ctrl+D)
  tail -f log | pipe -w "分析错误"

CONFIG / 配置:
  三种方式任选（支持自定义 API 地址和模型）:

  方式一：环境变量（推荐）
    export ANTHROPIC_API_KEY=你的key
    export ANTHROPIC_BASE_URL=https://你的api地址
    export ANTHROPIC_MODEL=模型名              # 可选，不设则自动检测
    cat log | pipe "问题"

  方式二：URL 内嵌 key
    cat log | pipe --api-url https://key:你的key@你的api地址/v1 "问题"

  方式三：分别指定
    cat log | pipe --api-key 你的key --api-url https://你的api地址/v1 "问题"

OPTIONS / 选项:
  -w, --watch         持续监听 stdin，实时分析
  -m, --model         指定模型名（不指定则自动从 API 获取）
  --max-tokens        最大回复长度（默认 4096）
  --api-url           API 地址（支持内嵌 key）
  --api-key           API 密钥
  --list-models       列出 API 可用的模型
  -h, --help          显示帮助

EXAMPLES / 示例:
  cat build.log | pipe "构建为什么失败了？"
  cat log | pipe --api-url https://key:xxx@api.example.com/v1 "分析"
  cat log | pipe -m gpt-4o "用 GPT-4o 分析"
  pipe --list-models --api-key 你的key --api-url https://你的地址/v1
  tail -f server.log | pipe -w "发现 ERROR 立刻报告"
`;

export function parseArgs(args: string[]): PipeOptions {
  const result: PipeOptions = {
    query: "",
    watch: false,
    maxTokens: 4096,
    listModels: false,
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
      case "--list-models": {
        result.listModels = true;
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
