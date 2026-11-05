# DSH Kit

> 102 Cordis plugins for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

DSH Kit 为 DeepSeek Harness 提供 102 个开箱即用的 Cordis 插件，覆盖网页搜索、社交媒体、商业情报、电商、加密货币、多模态 AI、插件商店等领域。

## 从源码构建和安装

需要 Node.js 22.19+ 和 pnpm 11.22.0。依赖来自公开 npm 包。

```bash
git clone https://github.com/sandbaseai/dsh-kit.git
cd dsh-kit
pnpm install --frozen-lockfile
pnpm typecheck
pnpm pack:plugins
pnpm test
```

构建产物位于 `dist/packages/`。使用 Desktop 自带的 `dsh` CLI 安装需要的包，例如：

```bash
dsh plugin --profile desktop add -w ./dist/packages/sandbaseai-dsh-plugin-web-search-0.1.0.tgz
```

Web 用户使用 `--profile web`，自定义 profile 使用其名称。每个工具包自带
`dsh.bundle` 清单、Cordis patch、运行代码和类型声明，共享实现已打包到工具中。
包内配置默认使用 `sandbase_` 工具名前缀，避免与 DSH 内置的 `web_search`、
`web_fetch` 等工具冲突。直接使用插件 API 时可通过 `toolPrefix` 配置前缀，默认空字符串。

这些本地 tarball 可用于安装验证，npm 发布状态需另行确认。

`packages/dsh-store` 与独立的 `sandbaseai/dsh-plugin-store` 使用同一包名。
已安装独立商店时，请跳过 Kit 中的同名商店包，避免覆盖。

## 插件分类

| 类别 | 数量 | 示例 |
|------|------|------|
| 🏪 插件商店 | 1 | `store_search`, `store_catalog`, `store_install` |
| 🤖 DeepSeek Chat | 1 | `deepseek_chat`, `deepseek_reason`, `deepseek_code` |
| 🌐 网页搜索 | 10 | `web_search`, `web_fetch`, `web_screenshot` |
| 📱 社交媒体 | 16 | `twitter_search`, `instagram_profile`, `tiktok_video` |
| 🏢 商业情报 | 12 | `company_search`, `company_enrich`, `pep_check` |
| 🛒 电商 | 7 | `amazon_product`, `google_shopping`, `price_compare` |
| 💰 金融 | 8 | `token_price`, `protocol_tvl`, `chain_tvl` |
| 🗺️ 地图 | 5 | `google_maps_places`, `flight_status`, `weather_lookup` |
| 🛠️ 开发工具 | 8 | `github_profile`, `email_validate`, `translate` |
| 🎨 多模态 AI | 16 | `image_gen_flux`, `video_gen_kling`, `tts_elevenlabs` |
| 📊 预测市场 | 5 | `polymarket_markets`, `kalshi_markets` |
| 🔌 MCP 集成 | 10 | `mcp_github`, `mcp_slack`, `mcp_figma` |
| 🔧 实用工具 | 3 | `structured_extract`, `google_search`, `serp_analyze` |

## 使用

通过 `dsh plugin --profile <name> add -w <tarball>` 安装时，DSH 会加载包内的
`cordis.patch.yml`。安装后重启对应 profile。构建与加载测试覆盖包结构和工具注册，
实际数据查询及模型生成仍需有效凭据和逐项服务验证。

## 配置 API Key

所有插件统一通过 Sandbase API 调用，只需一个 Key：

```bash
export SANDBASE_API_KEY="your-sandbase-api-key"
```

## 开发

```bash
git clone git@github.com:sandbaseai/dsh-kit.git
cd dsh-kit
pnpm install
pnpm build
```

## License

MIT