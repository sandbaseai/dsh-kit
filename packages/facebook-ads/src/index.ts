import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

export const name = 'dsh_plugin_facebook_ads'
export const inject = ['tools', 'web', 'systemPrompt'] as const

export interface Config {
  /** Prefix used to avoid collisions with host tools. */
  toolPrefix?: string
  enabled?: boolean
  timeoutMs?: number
}

export const Config: z<Config> = z.object({
  toolPrefix: z.string().default(''),
  enabled: z.boolean().default(true),
  timeoutMs: z.number().default(30000),
})

/** SandBase model / API id called by `facebook_ads`. */
const MODEL = 'facebook/ads-search'

/** Arguments of the `facebook_ads` tool. */
interface Args {
  query: string
  maxResults?: number
  country?: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    query: args.query,
    country: args.country,
  }
}

export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return
  return (async () => {

    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'facebook_ads',
      description: 'Search Facebook Ads Library for active advertisements by keyword or advertiser.',
      parameters: {
        query: { type: 'string', required: true, description: 'Search query for ads.' },
        maxResults: { type: 'number', description: 'Max results (default 20).', minimum: 1, maximum: 100 },
        country: { type: 'string', description: 'Country code (e.g. US, GB).' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'facebook_ads',
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