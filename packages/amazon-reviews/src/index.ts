/**
 * DSH Cordis plugin: amazon_reviews
 *
 * Get customer reviews for an Amazon product across regions.
 * @module @sandbaseai/dsh-plugin-amazon-reviews
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_amazon_reviews'

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

/** SandBase model / API id called by `amazon_reviews`. */
const MODEL = 'amazon/product'

/** Arguments of the `amazon_reviews` tool. */
interface Args {
  asin: string
  maxReviews?: number
  country?: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    asin: args.asin,
  }
}

/**
 * Register the `amazon_reviews` tool with the harness tools service.
 * The tool runs `amazon/product` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'amazon_reviews',
      description: 'Get customer reviews for an Amazon product across regions.',
      parameters: {
      asin: {
        type: 'string',
        required: true,
        description: 'Amazon ASIN.',
      },
      maxReviews: {
        type: 'number',
        description: 'Max reviews (default 20).',
        minimum: 1,
        maximum: 100,
      },
      country: {
        type: 'string',
        description: 'Country code.',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'amazon_reviews',
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
