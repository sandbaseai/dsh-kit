/**
 * DSH Cordis plugin: polymarket_markets
 *
 * Get current Polymarket prediction markets and odds.
 * @module @sandbaseai/dsh-plugin-polymarket-markets
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_polymarket_markets'

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

/** SandBase model / API id called by `polymarket_markets`. */
const MODEL = 'polymarket/markets'

/** Arguments of the `polymarket_markets` tool. */
interface Args {
  category?: string
  limit?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    limit: args.limit ?? 20,
  }
}

/**
 * Register the `polymarket_markets` tool with the harness tools service.
 * The tool runs `polymarket/markets` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'polymarket_markets',
      description: 'Get current Polymarket prediction markets and odds.',
      parameters: {
      category: {
        type: 'string',
        description: 'Market category (e.g. politics, sports, crypto).',
      },
      limit: {
        type: 'number',
        description: 'Max markets (default 20).',
        minimum: 1,
        maximum: 100,
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'polymarket_markets',
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
