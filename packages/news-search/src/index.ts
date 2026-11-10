/**
 * DSH Cordis plugin: news_search
 *
 * Search Google News for articles matching a query.
 * @module @sandbaseai/dsh-plugin-news-search
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_news_search'

/** Services required by this plugin. */
export const inject = ['tools', 'web', 'systemPrompt'] as const

/** Plugin configuration. */
export interface Config {
  /** Prefix used to avoid collisions with host tools. */
  toolPrefix?: string
  /** Enable this plugin. Defaults to true. */
  enabled?: boolean
  /** Request timeout in milliseconds. */
  timeoutMs?: number
}

export const Config: z<Config> = z.object({
  toolPrefix: z.string().default(''),
  enabled: z.boolean().default(true),
  timeoutMs: z.number().default(30000),
})

/** SandBase model / API id called by `news_search`. */
const MODEL = 'dataforseo/v3/serp/google/news/live/advanced'

/** Arguments of the `news_search` tool. */
interface Args {
  query: string
  maxResults?: number
  language?: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    keyword: args.query,
    depth: args.maxResults !== undefined ? String(args.maxResults) : undefined,
    language_code: args.language,
  }
}

/**
 * Register the `news_search` tool with the harness tools service.
 * The tool runs `dataforseo/v3/serp/google/news/live/advanced` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'news_search',
      description: 'Search Google News for articles matching a query.',
      parameters: {
      query: {
        type: 'string',
        required: true,
        description: 'News search query.',
      },
      maxResults: {
        type: 'number',
        description: 'Max results (default 20).',
        minimum: 1,
        maximum: 100,
      },
      language: {
        type: 'string',
        description: 'Language code (e.g. en, zh).',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'news_search',
          model: MODEL,
          input: toInput(args),
          timeoutMs: config.timeoutMs ?? 30000,
          signal: exec.signal,
        })
        return JSON.stringify(result, null, 2)
      },
    }))
  })()
}
