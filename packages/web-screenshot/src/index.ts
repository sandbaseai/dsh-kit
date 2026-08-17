/**
 * DSH Cordis plugin: web_screenshot
 *
 * Capture a screenshot of a web page.
 * @module @sandbaseai/dsh-plugin-web-screenshot
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { createFetchClient, resolveCredential, handleUpstreamError } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_web_screenshot'

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
 * Register the `web_screenshot` tool with the harness tools service.
 * Resolves credentials, creates an HTTP client, and registers a
 * model-callable tool that proxies to the upstream API.
 */
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
      name: 'web_screenshot',
      description: 'Capture a screenshot of a web page.',
      parameters: {
      url: {
        type: 'string',
        required: true,
        description: 'URL to screenshot.',
      },
      fullPage: {
        type: 'boolean',
        description: 'Capture full scrollable page.',
      },
      viewportWidth: {
        type: 'number',
        description: 'Viewport width (default 1280).',
      },
      viewportHeight: {
        type: 'number',
        description: 'Viewport height (default 800).',
      },
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
          handleUpstreamError(err, 'web_screenshot')
  throw new Error('unreachable')
        }
      },
    }))
  })()
}
