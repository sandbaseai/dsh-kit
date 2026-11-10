import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

export const name = 'dsh_plugin_google_maps_places'
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

/** SandBase model / API id called by `google_maps_places`. */
const MODEL = 'dataforseo/v3/serp/google/maps/live/advanced'

/** Arguments of the `google_maps_places` tool. */
interface Args {
  query: string
  location?: string
  maxResults?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    keyword: args.location ? `${args.query} near ${args.location}` : args.query,
  }
}

export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return
  return (async () => {

    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'google_maps_places',
      description: 'Search for places on Google Maps by name, type, or location.',
      parameters: {
        query: { type: 'string', required: true, description: 'Place name or type to search for.' },
        location: { type: 'string', description: 'Location to search near (city, address, or coordinates).' },
        maxResults: { type: 'number', description: 'Max results (default 20).', minimum: 1, maximum: 60 },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'google_maps_places',
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