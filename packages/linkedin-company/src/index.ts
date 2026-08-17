/**
 * DSH Cordis plugin: linkedin_company
 *
 * Get employee list for a LinkedIn company page.
 * @module @sandbaseai/dsh-plugin-linkedin-company
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { createFetchClient, resolveCredential, handleUpstreamError } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_linkedin_company'

/** Services required by this plugin. */
export const inject = ['tools', 'web', 'systemPrompt'] as const

/** Plugin configuration. */
export interface Config {
  /** Enable this plugin. Defaults to true. */
  enabled?: boolean
  /** Request timeout in milliseconds. */
  timeoutMs?: number
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  timeoutMs: z.number().default(30000),
})

/**
 * Register the `linkedin_company` tool with the harness tools service.
 * Resolves credentials, creates an HTTP client, and registers a
 * model-callable tool that proxies to the upstream API.
 */
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
      name: 'linkedin_company',
      description: 'Get employee list for a LinkedIn company page.',
      parameters: {
      companyUrl: {
        type: 'string',
        required: true,
        description: 'LinkedIn company page URL.',
      },
      maxResults: {
        type: 'number',
        description: 'Max employees (default 50).',
        minimum: 1,
        maximum: 200,
      },
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
          handleUpstreamError(err, 'linkedin_company')
        }
      },
    }))
  })()
}
