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

<h1 align="center">pipe-ai</h1>

<p align="center">
  <strong>终端输出 → AI 分析。一个管道命令，问任何问题。</strong>
  <br>
  Pipe any command output to Claude and ask questions right in your terminal.
</p>

<p align="center">
  <a href="https://github.com/ChuckMc/pipe-ai/releases"><img src="https://img.shields.io/github/v/release/ChuckMc/pipe-ai" alt="GitHub Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
</p>

```bash
cat build.log | pipe "构建为什么失败了？"
tail -f server.log | pipe -w "发现 ERROR 立刻报告"
kubectl get pods -A | pipe "哪些 Pod 状态异常？"
```

---

## 为什么用 pipe？

**遇到问题** — **打开浏览器** — **复制粘贴** — **等回复** — **切回终端**

还是

```bash
cat log | pipe "why？"
```

pipe 让你**全程不离开终端**，一行命令把任何输出丢给 AI，用自然语言问问题，实时流式回答。

---

## 快速开始

```bash
# 1. 安装
npm install -g pipeai-cli

# 2. 设置 API（任选一种方式）

## 方式一：环境变量（推荐）
export ANTHROPIC_API_KEY=sk-ant-...
export ANTHROPIC_BASE_URL=https://api.anthropic.com

## 方式二：URL 内嵌 Key（一行搞定）
cat build.log | pipe --api-url https://key:sk-ant-xxx@api.anthropic.com "构建为什么失败了？"

## 方式三：直接传 key
cat build.log | pipe --api-key sk-ant-... "有什么问题？"

# 3. 开用
cat build.log | pipe "为什么构建失败了？有什么修复建议？"
```

---

## 使用示例

### 调试构建失败

```bash
# 中文提问
cat build.log | pipe "报错原因是什么？怎么修复？"

# English
cat build.log | pipe "What caused the error? How to fix?"
```

### 排查服务器异常

```bash
curl -s https://api.example.com/health | pipe "服务都正常吗？"
dmesg | pipe "有硬件错误吗？"
journalctl -u nginx --no-pager -p err | pipe "总结最近的错误"
```

### 日志实时监控

```bash
tail -f server.log  | pipe -w "只报告 ERROR 和 WARNING，忽略 INFO"
tail -f access.log | pipe -w "发现 5xx 或慢请求时警报"
tail -f app.log    | pipe -w "检测到 OOM 或内存泄漏迹象就告诉我"
```

### 代码审查

```bash
git diff main...HEAD | pipe "Review these changes, any bugs?"
```

### Kubernetes 运维

```bash
kubectl describe pod crash-pod | pipe "为什么这个 Pod 一直 CrashLoopBackOff？"
kubectl get events --sort-by=.lastTimestamp | pipe "集群最近有什么异常？"
```

### 数据库

```bash
psql -c "EXPLAIN ANALYZE SELECT ..." | pipe "这个查询慢在哪？索引怎么优化？"
```

---

## 选项

| 参数 | 作用 |
|------|------|
| `-w`, `--watch` | 持续监听 stdin，新数据自动分析 |
| `-m`, `--model` | 指定 Claude 模型 |
| `--max-tokens` | 最大回复长度 |
| `--api-key` | API 密钥 |
| `--api-url` | API 地址，支持内嵌 key：`https://key:sk-ant-xxx@host.com` |
| `-h`, `--help`  | 显示帮助 |

---

## 工作原理

```
你的命令 → stdout → pipe → Claude API → 流式回答 → 你的终端
```

零配置、无守护进程、不需要 YAML。

---

## License

MIT
