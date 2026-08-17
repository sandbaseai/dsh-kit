# DSH Kit

> 100+ Cordis plugins for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

DSH Kit 为 DeepSeek Harness 提供 100+ 开箱即用的 Cordis 插件，覆盖网页搜索、社交媒体、商业情报、电商、加密货币、多模态 AI 等领域。

## 安装

```bash
# 1. 确保已安装 DeepSeek Harness
# 2. 安装插件
pnpm add @deepseek-ai/dsh-plugin-web-search
pnpm add @deepseek-ai/dsh-plugin-twitter-search
# ... 按需安装
```

## 插件分类

| 类别 | 数量 | 示例 |
|------|------|------|
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

在 `cordis.patch.yml` 中启用插件：

```yaml
- name: '@deepseek-ai/dsh-plugin-web-search'
  config:
    enabled: true
    timeoutMs: 30000

- name: '@deepseek-ai/dsh-plugin-github-profile'
  config:
    enabled: true
```

## 配置 API Key

```bash
export CONTEXT_DEV_API_KEY="your-key"
export APIFY_API_KEY="your-key"
export APOLLO_API_KEY="your-key"
# ... 按需配置
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