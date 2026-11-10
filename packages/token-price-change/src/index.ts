/**
 * DSH Cordis plugin: token_price_change
 *
 * Get token price percentage changes over various time periods.
 * @module @sandbaseai/dsh-plugin-token-price-change
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_token_price_change'

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

/** SandBase model / API id called by `token_price_change`. */
const MODEL = 'coingecko/coins-markets'

/** Arguments of the `token_price_change` tool. */
interface Args {
  token: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    symbols: args.token.toLowerCase(),
    // Clear the upstream ids/names defaults (bitcoin), which otherwise override symbols.
    ids: '',
    names: '',
    vs_currency: 'usd',
    price_change_percentage: '1h,24h,7d,30d,1y',
  }
}

/**
 * Register the `token_price_change` tool with the harness tools service.
 * The tool runs `coingecko/coins-markets` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'token_price_change',
      description: 'Get token price percentage changes over various time periods.',
      parameters: {
      token: {
        type: 'string',
        required: true,
        description: 'Token symbol or address.',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'token_price_change',
          model: MODEL,
          input: toInput(args),
          keepEmpty: ['ids', 'names'],
          timeoutMs: config.timeoutMs ?? 30000,
          signal: exec.signal,
        })
        return JSON.stringify(result, null, 2)
      },
    }))
  })()
}
