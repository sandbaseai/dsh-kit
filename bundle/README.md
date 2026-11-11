# SandBase Kit for DSH

一个配置包，将 DeepSeek Harness 连接到 SandBase MCP。复用 DSH 自带的
`@deepseek-ai/dsh-mcp-client`，通过少量通用工具按需发现和执行 SandBase 能力。

## 安装

需要包含 `@deepseek-ai/dsh-mcp-client` 的 DSH Desktop 或 Web 版本。
本包按 Desktop 0.2.2-rc.1 的配置协议编写。

在启动 DSH 的进程环境中配置 `SANDBASE_API_KEY`。可选的 `SANDBASE_MCP_URL`
用于指定完整 MCP 地址，默认 `https://api.sandbase.ai/v1/mcp`。
密钥通过环境变量读取，不写入插件包。

使用 Desktop 自带的 CLI 安装构建产物：

```sh
dsh plugin --profile desktop add -w ./sandbaseai-dsh-kit-0.2.0-preview.2.tgz
```

重启对应 profile。在 macOS 中，通过 Finder 启动的应用可能无法读取终端的
环境变量。应在已加载上述变量的 shell 中启动应用可执行文件，或使用宿主支持的
安全凭据配置。仅在 `.zshrc` 中定义变量不能证明 Desktop 已读取它。

## 使用

连接后，DSH 注册形如 `mcp__sandbase_api__sandbase_discover` 的工具。
服务端实际返回的工具列表决定可用能力。

1. `sandbase_discover` 查找能力。
2. `sandbase_inspect` 获取当前输入参数和价格。
3. `sandbase_run` 执行选定能力。
4. 异步任务通过 `sandbase_run_get` 获取状态和最终结果，避免重复提交。

`账户`、`历史运行`等工具由服务端提供。使用费按 SandBase 返回的定价执行。
新增模型或 API 通过服务端目录发现，无需为每个能力另装插件。

## 迁移

原 Kit 的独立工具包（v0.1.0）已废弃：它们调用的 `GET /v1/run` 已不可用。
已安装旧包的用户应在插件管理中停用这些 `sandbase_` 工具包，改用本包的
`mcp__sandbase_api__` 工具。

Plugin Store 用于浏览和安装 DSH 插件；managed-agents 用于 Agent 管理。
它们与本包分别安装。

## 验证范围

配置打包检查与真实服务调用分别验证。通过安装或工具发现不能证明所有模型、
数据 API 和媒体结果展示均可用。发布记录应列出实际完成的验证项。
