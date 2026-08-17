import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { createFetchClient, resolveCredential, handleUpstreamError } from '@sandbaseai/dsh-plugin-shared'

export const name = 'dsh_plugin_google_maps_places'
export const inject = ['tools', 'web', 'systemPrompt'] as const

export interface Config {
  enabled?: boolean
  timeoutMs?: number
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  timeoutMs: z.number().default(30000),
})

export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return
  void (async () => {
    const apiKey = await resolveCredential(ctx, 'apify', 'api_key')
    const client = createFetchClient({
      baseUrl: 'https://api.sandbase.ai',
      timeoutMs: config.timeoutMs ?? 30000,
      defaultHeaders: { Authorization: `Bearer ${apiKey}` },
    })
    ctx.tools.register(defineTool({
      name: 'google_maps_places',
      description: 'Search for places on Google Maps by name, type, or location.',
      parameters: {
        query: { type: 'string', required: true, description: 'Place name or type to search for.' },
        location: { type: 'string', description: 'Location to search near (city, address, or coordinates).' },
        maxResults: { type: 'number', description: 'Max results (default 20).', minimum: 1, maximum: 60 },
      },
      output: {
        schema: { type: 'object' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute(args, { signal }) {
        try {
          const params = new URLSearchParams()
          for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
            if (value !== undefined && value !== null && value !== '') {
              params.append(key, String(value))
            }
          }
          const qs = params.toString()
          const data = await client.get('/v1/run' + (qs ? '?' + qs : ''), signal)
          return data
        } catch (err) {
          handleUpstreamError(err, 'google_maps_places')
        }
      },
    }))
  })()
}