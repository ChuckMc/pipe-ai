<!--
╔══════════════════════════════════════════════════════════════════════╗
║  DreamSeed 种梦计划 — AI创造者大赛  官方 README 模板                ║
║                                                                      ║
║  使用说明：                                                          ║
║  1. 将本模板放在参赛仓库根目录 README.md 的顶部                       ║
║  2. 头图使用 DreamField 官方公开活动图片地址                         ║
║  3. 请保留 DREAMFIELD_README_HEADER_START / END 标识                 ║
║  4. 分割线以下供创作者自由编写项目内容                               ║
╚══════════════════════════════════════════════════════════════════════╝
-->

<!-- DREAMFIELD_README_HEADER_START -->

<p align="center">
  <a href="https://www.dreamfield.top">
    <img src="https://www.dreamfield.top/dream-field/contest-readme/assets/dreamseed-readme-banner.png" alt="DreamSeed 种梦计划参赛作品" width="100%" />
  </a>
</p>

<!-- DREAMFIELD_README_HEADER_END -->

<h1 align="center">pipe</h1>

<p align="center">
  <strong>终端输出 → AI 分析，一个管道命令问任何问题</strong><br>
  <sub>Pipe any command output to AI and ask questions in natural language, right in your terminal.</sub>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pipeai-cli"><img src="https://img.shields.io/npm/v/pipeai-cli" alt="npm"></a>
  <a href="https://github.com/ChuckMc/pipe-ai/releases"><img src="https://img.shields.io/github/v/release/ChuckMc/pipe-ai" alt="GitHub Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node >= 18">
</p>

---

```bash
cat build.log | pipe "构建为什么失败了？"
tail -f server.log | pipe -w "发现 ERROR 立刻报告"
kubectl get pods -A | pipe "哪些 Pod 状态异常？"
```

## 为什么用 pipe？

> 遇到问题 → 打开浏览器 → 复制粘贴 → 等回复 → 切回终端

还是

```bash
cat log | pipe "why?"
```

**一行命令，全程不离开终端。** 任何命令输出丢给 AI，自然语言问问题，实时流式回答。

---

## 快速开始

```bash
# 1. 安装
npm install -g pipeai-cli

# 2. 开用
```

### 方式一：环境变量（推荐，永久生效）

```bash
export ANTHROPIC_API_KEY=你的key
export ANTHROPIC_BASE_URL=https://你的api地址   # 可选，默认 Anthropic 官方
export ANTHROPIC_MODEL=模型名                    # 可选，不设则自动检测
cat build.log | pipe "为什么构建失败了？"
```

> 建议加入 `~/.zshrc` 或 `~/.bashrc`。

### 方式二：URL 内嵌 key（一行搞定）

```bash
cat build.log | pipe --api-url https://key:你的key@你的api地址/v1 "分析一下"
```

### 方式三：分别指定 URL 和 key

```bash
cat build.log | pipe --api-key 你的key --api-url https://你的api地址/v1 "有什么问题？"
```

### 选择模型

```bash
# 查看 API 支持哪些模型
pipe --list-models --api-key 你的key --api-url https://你的api地址/v1

# 指定模型（不指定则自动选第一个可用模型）
cat build.log | pipe -m DeepSeek-V4-Flash "有什么问题？"
```

> 支持任意大模型 API（Anthropic、OpenAI 兼容、DeepSeek、智谱等），只要填对应的 URL 和 Key。自动从 API `/models` 端点检测可用模型。

---

## 使用示例

| 场景 | 命令 |
|------|------|
| 调试构建 | `cat build.log \| pipe "报错原因？怎么修复？"` |
| 排查服务器 | `curl -s https://api.example.com/health \| pipe "服务正常吗？"` |
| 日志实时监控 | `tail -f server.log \| pipe -w "只报告 ERROR 和 WARNING"` |
| 代码审查 | `git diff main...HEAD \| pipe "Review these changes, any bugs?"` |
| K8s 运维 | `kubectl describe pod crash-pod \| pipe "为什么 CrashLoopBackOff？"` |
| 数据库 | `psql -c "EXPLAIN ANALYZE ..." \| pipe "这个查询慢在哪？"` |
| 硬件诊断 | `dmesg \| pipe "有硬件错误吗？"` |
| 安全审计 | `cat access.log \| awk '{print $1}' \| sort \| uniq -c \| sort -rn \| pipe "有可疑 IP 吗？"` |

---

## 选项

| 参数 | 说明 |
|------|------|
| `-w`, `--watch` | 持续监听 stdin，新数据自动分析 |
| `-m`, `--model` | 指定模型名（默认自动检测） |
| `--max-tokens` | 最大回复长度（默认 4096） |
| `--api-url` | API 地址，支持内嵌 key：`https://key:xxx@host.com` |
| `--api-key` | API 密钥 |
| `-h`, `--help` | 显示帮助 |

### 环境变量

| 变量 | 说明 |
|------|------|
| `ANTHROPIC_API_KEY` | API 密钥 |
| `ANTHROPIC_BASE_URL` | API 地址（默认 Anthropic 官方） |
| `ANTHROPIC_MODEL` | 模型名（可选，不设则自动检测） |

---

## 工作原理

```
你的命令 → stdout → pipe → AI API → 流式回答 → 终端
```

- 零配置、无守护进程、不需要 YAML
- 自动检测用户语言，用中文问就中文答
- 支持自定义 API 地址（第三方兼容服务、本地部署等）

---

## License

MIT
