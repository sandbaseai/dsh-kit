/**
 * DSH Cordis plugin: web_search
 *
 * Search the web and return results with titles, URLs, and snippets. Supports Google operators: site:, -site:, "quoted phrases", OR.
 * @module @sandbaseai/dsh-plugin-web-search
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_web_search'

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

/** SandBase model / API id called by `web_search`. */
const MODEL = 'scholar/search-web'

/** Arguments of the `web_search` tool. */
interface Args {
  query: string
  numResults?: number
  freshness?: string
  country?: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    query: args.query,
    max_num_results: args.numResults,
  }
}

/**
 * Register the `web_search` tool with the harness tools service.
 * The tool runs `scholar/search-web` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'web_search',
      description: 'Search the web and return results with titles, URLs, and snippets. Supports Google operators: site:, -site:, "quoted phrases", OR.',
      parameters: {
      query: {
        type: 'string',
        required: true,
        description: 'Search query.',
      },
      numResults: {
        type: 'number',
        description: 'Number of results (10-100, default 10).',
        minimum: 10,
        maximum: 100,
      },
      freshness: {
        type: 'string',
        description: 'Time window.',
        enum: ['last_24_hours', 'last_week', 'last_month', 'last_year'],
      },
      country: {
        type: 'string',
        description: 'Two-letter ISO country code.',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'web_search',
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
