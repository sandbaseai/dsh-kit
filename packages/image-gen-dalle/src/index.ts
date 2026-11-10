import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

export const name = 'dsh_plugin_image_gen_dalle'
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
  timeoutMs: z.number().default(60000),
})

/** SandBase model / API id called by `image_gen_dalle`. */
const MODEL = 'openai/gpt-image-2'

/** Arguments of the `image_gen_dalle` tool. */
interface Args {
  prompt: string
  size?: string
  quality?: string
  style?: string
}

const ASPECT: Record<string, string> = { '1024x1024': '1:1', '1792x1024': '16:9', '1024x1792': '9:16' }

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    prompt: args.style ? `${args.prompt} (style: ${args.style})` : args.prompt,
    aspect_ratio: args.size ? ASPECT[args.size] : undefined,
    quality: args.quality === 'hd' ? 'high' : 'medium',
  }
}

export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return
  return (async () => {

    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'image_gen_dalle',
      description: 'Generate images using OpenAI DALL·E 3 with high-quality prompt following.',
      parameters: {
        prompt: { type: 'string', required: true, description: 'Image generation prompt.' },
        size: { type: 'string', description: 'Image size.', enum: ['1024x1024', '1792x1024', '1024x1792'] },
        quality: { type: 'string', description: 'Quality level.', enum: ['standard', 'hd'] },
        style: { type: 'string', description: 'Style.', enum: ['vivid', 'natural'] },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'image_gen_dalle',
          model: MODEL,
          input: toInput(args),
          timeoutMs: config.timeoutMs ?? 60000,
          signal: exec.signal,
        })
        return JSON.stringify(result, null, 2)
      },
    }))
  })()
}