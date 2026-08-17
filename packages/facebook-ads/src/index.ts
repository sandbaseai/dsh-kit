import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { createFetchClient, resolveCredential, handleUpstreamError } from '@sandbaseai/dsh-plugin-shared'

export const name = 'dsh_plugin_facebook_ads'
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
    const apiKey = await resolveCredential(ctx, 'sandbase', 'api_key')
    const client = createFetchClient({
      baseUrl: 'https://api.sandbase.ai',
      timeoutMs: config.timeoutMs ?? 30000,
      defaultHeaders: { Authorization: `Bearer ${apiKey}` },
    })
    ctx.tools.register(defineTool({
      name: 'facebook_ads',
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
        try {
          const params = new URLSearchParams()
          for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
            if (value !== undefined && value !== null && value !== '') {
              params.append(key, String(value))
            }
          }
          const qs = params.toString()
          const data = await client.get('/v1/run' + (qs ? '?' + qs : ''), exec.signal)
          return JSON.stringify(data, null, 2)
        } catch (err) {
          handleUpstreamError(err, 'facebook_ads')
  throw new Error('unreachable')
        }
      },
    }))
  })()
}