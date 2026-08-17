import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { createFetchClient, resolveCredential, handleUpstreamError } from '@sandbaseai/dsh-plugin-shared'

export const name = 'dsh_plugin_image_gen_dalle'
export const inject = ['tools', 'web', 'systemPrompt'] as const

export interface Config {
  enabled?: boolean
  timeoutMs?: number
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  timeoutMs: z.number().default(60000),
})

export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return
  void (async () => {
    const apiKey = await resolveCredential(ctx, 'sandbase', 'api_key')
    const client = createFetchClient({
      baseUrl: 'https://api.sandbase.ai',
      timeoutMs: config.timeoutMs ?? 60000,
      defaultHeaders: { Authorization: `Bearer ${apiKey}` },
    })
    ctx.tools.register(defineTool({
      name: 'image_gen_dalle',
      description: 'Generate images using OpenAI DALL·E 3 with high-quality prompt following.',
      parameters: {
        prompt: { type: 'string', required: true, description: 'Image generation prompt.' },
        size: { type: 'string', description: 'Image size.', enum: ['1024x1024', '1792x1024', '1024x1792'] },
        quality: { type: 'string', description: 'Quality level.', enum: ['standard', 'hd'] },
        style: { type: 'string', description: 'Style.', enum: ['vivid', 'natural'] },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, _value) => [{ type: 'text', text: `Task submitted. Use the result endpoint to check completion.` }],
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
          handleUpstreamError(err, 'image_gen_dalle')
  throw new Error('unreachable')
        }
      },
    }))
  })()
}