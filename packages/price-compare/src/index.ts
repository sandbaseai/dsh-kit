/**
 * DSH Cordis plugin: price_compare
 *
 * Compare prices for a product across multiple retailers.
 * @module @sandbaseai/dsh-plugin-price-compare
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_price_compare'

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

/** SandBase model / API id called by `price_compare`. */
const MODEL = 'google-shopping/search'

/** Arguments of the `price_compare` tool. */
interface Args {
  product: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    q: args.product,
  }
}

/**
 * Register the `price_compare` tool with the harness tools service.
 * The tool runs `google-shopping/search` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'price_compare',
      description: 'Compare prices for a product across multiple retailers.',
      parameters: {
      product: {
        type: 'string',
        required: true,
        description: 'Product name or EAN/UPC barcode.',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'price_compare',
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
