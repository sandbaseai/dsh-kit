/**
 * DSH Cordis plugin: image_gen_flux
 *
 * Generate images using Black Forest Labs Flux Pro model.
 * This is an asynchronous operation. The tool returns a task ID;
 * use the result endpoint to check completion status.
 * @module @sandbaseai/dsh-plugin-image-gen-flux
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, createFetchClient, resolveCredential, handleUpstreamError } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_image_gen_flux'

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
 * Register the `image_gen_flux` tool with the harness tools service.
 * Resolves credentials, creates an HTTP client, and registers a
 * model-callable tool that proxies to the upstream API.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'image_gen_flux',
      description: 'Generate images using Black Forest Labs Flux Pro model.',
      parameters: {
      prompt: {
        type: 'string',
        required: true,
        description: 'Image generation prompt. Be detailed and specific.',
      },
      negativePrompt: {
        type: 'string',
        description: 'What to avoid in the image.',
      },
      width: {
        type: 'number',
        description: 'Image width (default 1024).',
      },
      height: {
        type: 'number',
        description: 'Image height (default 1024).',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, _value) => [{ type: 'text', text: `Task submitted. Use the result endpoint to check completion.` }],
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
          handleUpstreamError(err, 'image_gen_flux')
  throw new Error('unreachable')
        }
      },
    }))
  })()
}
