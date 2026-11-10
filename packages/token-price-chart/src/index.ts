/**
 * DSH Cordis plugin: token_price_chart
 *
 * Get historical token price chart data.
 * @module @sandbaseai/dsh-plugin-token-price-chart
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_token_price_chart'

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

/** SandBase model / API id called by `token_price_chart`. */
const MODEL = 'coingecko/coins-market-chart'

/** Arguments of the `token_price_chart` tool. */
interface Args {
  token: string
  days?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    id: args.token.toLowerCase(),
    days: String(args.days ?? 30),
    vs_currency: 'usd',
  }
}

/**
 * Register the `token_price_chart` tool with the harness tools service.
 * The tool runs `coingecko/coins-market-chart` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'token_price_chart',
      description: 'Get historical token price chart data.',
      parameters: {
      token: {
        type: 'string',
        required: true,
        description: 'Token symbol or address.',
      },
      days: {
        type: 'number',
        description: 'Days of history (default 30).',
        minimum: 1,
        maximum: 365,
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'token_price_chart',
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
