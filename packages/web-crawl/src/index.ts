/**
 * DSH Cordis plugin: web_crawl
 *
 * Crawl a website and extract pages as Markdown.
 * @module @sandbaseai/dsh-plugin-web-crawl
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_web_crawl'

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

/** SandBase model / API id called by `web_crawl`. */
const MODEL = 'firecrawl/crawl'

/** Arguments of the `web_crawl` tool. */
interface Args {
  url: string
  maxPages?: number
  maxDepth?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    url: args.url,
    limit: args.maxPages ?? 10,
    scrapeOptions: { formats: ['markdown'] },
  }
}

/**
 * Register the `web_crawl` tool with the harness tools service.
 * The tool runs `firecrawl/crawl` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'web_crawl',
      description: 'Crawl a website and extract pages as Markdown.',
      parameters: {
      url: {
        type: 'string',
        required: true,
        description: 'Starting URL.',
      },
      maxPages: {
        type: 'number',
        description: 'Max pages (default 10).',
        minimum: 1,
        maximum: 100,
      },
      maxDepth: {
        type: 'number',
        description: 'Max crawl depth.',
        minimum: 1,
        maximum: 5,
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'web_crawl',
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
