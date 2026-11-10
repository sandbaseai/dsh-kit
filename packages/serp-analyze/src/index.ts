/**
 * DSH Cordis plugin: serp_analyze
 *
 * Analyze Search Engine Results Page (SERP) for a keyword.
 * @module @sandbaseai/dsh-plugin-serp-analyze
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_serp_analyze'

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

/** SandBase model / API id called by `serp_analyze`. */
const MODEL = 'dataforseo/v3/serp/google/organic/live/advanced'

/** Arguments of the `serp_analyze` tool. */
interface Args {
  keyword: string
  country?: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    keyword: args.keyword,
  }
}

/**
 * Register the `serp_analyze` tool with the harness tools service.
 * The tool runs `dataforseo/v3/serp/google/organic/live/advanced` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'serp_analyze',
      description: 'Analyze Search Engine Results Page (SERP) for a keyword.',
      parameters: {
      keyword: {
        type: 'string',
        required: true,
        description: 'Keyword to analyze.',
      },
      country: {
        type: 'string',
        description: 'Country code (e.g. us).',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'serp_analyze',
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
