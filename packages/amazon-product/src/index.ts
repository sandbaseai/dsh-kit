/**
 * DSH Cordis plugin: amazon_product
 *
 * Get detailed product information from Amazon.
 * @module @sandbaseai/dsh-plugin-amazon-product
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_amazon_product'

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

/** SandBase model / API id called by `amazon_product`. */
const MODEL = 'amazon/product-detail'

/** Arguments of the `amazon_product` tool. */
interface Args {
  asin: string
  country?: string
}

/** Accept an ASIN or an Amazon product URL. */
function asinOf(value: string): string {
  return /\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i.exec(value)?.[1] ?? value.trim()
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    asin: asinOf(args.asin),
    country: args.country?.toUpperCase(),
  }
}

/**
 * Register the `amazon_product` tool with the harness tools service.
 * The tool runs `amazon/product-detail` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'amazon_product',
      description: 'Get detailed product information from Amazon.',
      parameters: {
      asin: {
        type: 'string',
        required: true,
        description: 'Amazon ASIN or product URL.',
      },
      country: {
        type: 'string',
        description: 'Amazon marketplace country code.',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'amazon_product',
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
