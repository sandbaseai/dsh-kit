/**
 * DSH Cordis plugin: 3d_gen_hunyuan
 *
 * Generate 3D models from text or images using Tencent Hunyuan3D.
 * This is an asynchronous operation. The tool returns a task ID;
 * use the result endpoint to check completion status.
 * @module @sandbaseai/dsh-plugin-3d-gen-hunyuan
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, createFetchClient, resolveCredential, handleUpstreamError } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_3d_gen_hunyuan'

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
 * Register the `3d_gen_hunyuan` tool with the harness tools service.
 * Resolves credentials, creates an HTTP client, and registers a
 * model-callable tool that proxies to the upstream API.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + '3d_gen_hunyuan',
      description: 'Generate 3D models from text or images using Tencent Hunyuan3D.',
      parameters: {
      prompt: {
        type: 'string',
        required: true,
        description: 'Description of the 3D model, or image URL for image-to-3D.',
      },
      quality: {
        type: 'string',
        description: 'Quality level.',
        enum: ['rapid', 'pro'],
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
          handleUpstreamError(err, '3d_gen_hunyuan')
  throw new Error('unreachable')
        }
      },
    }))
  })()
}
