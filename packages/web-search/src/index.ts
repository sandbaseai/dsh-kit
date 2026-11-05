/**
 * DSH Cordis plugin: web_search
 *
 * Search the web and return results with titles, URLs, and snippets. Supports Google operators: site:, -site:, "quoted phrases", OR.
 * @module @sandbaseai/dsh-plugin-web-search
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, createFetchClient, resolveCredential, handleUpstreamError } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_web_search'

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

/**
 * Register the `web_search` tool with the harness tools service.
 * Resolves credentials, creates an HTTP client, and registers a
 * model-callable tool that proxies to the upstream API.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'web_search',
      description: 'Search the web and return results with titles, URLs, and snippets. Supports Google operators: site:, -site:, "quoted phrases", OR.',
      parameters: {
      query: {
        type: 'string',
        required: true,
        description: 'Search query.',
      },
      numResults: {
        type: 'number',
        description: 'Number of results (10-100, default 10).',
        minimum: 10,
        maximum: 100,
      },
      freshness: {
        type: 'string',
        description: 'Time window.',
        enum: ['last_24_hours', 'last_week', 'last_month', 'last_year'],
      },
      country: {
        type: 'string',
        description: 'Two-letter ISO country code.',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        try {
          const apiKey = await resolveCredential(ctx, 'sandbase', 'api_key')
          const client = createFetchClient({
            baseUrl: 'https://api.sandbase.ai',
            timeoutMs: config.timeoutMs ?? 30000,
            defaultHeaders: { Authorization: `Bearer ${apiKey}` },
          })
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
          handleUpstreamError(err, 'web_search')
  throw new Error('unreachable')
        }
      },
    }))
  })()
}
