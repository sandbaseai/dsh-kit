/**
 * DSH Cordis plugin: image_upscale
 *
 * Upscale an image to higher resolution with AI enhancement.
 * This is an asynchronous operation. The tool returns a task ID;
 * use the result endpoint to check completion status.
 * @module @sandbaseai/dsh-plugin-image-upscale
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_image_upscale'

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

/** SandBase model / API id called by `image_upscale`. */
const MODEL = 'clarity-ai/clarity-upscaler'

/** Arguments of the `image_upscale` tool. */
interface Args {
  imageUrl: string
  scale?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    image: args.imageUrl,
    upscale_factor: args.scale ?? 2,
    prompt: 'masterpiece, best quality, highres',
  }
}

/**
 * Register the `image_upscale` tool with the harness tools service.
 * The tool runs `clarity-ai/clarity-upscaler` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'image_upscale',
      description: 'Upscale an image to higher resolution with AI enhancement.',
      parameters: {
      imageUrl: {
        type: 'string',
        required: true,
        description: 'URL of image to upscale.',
      },
      scale: {
        type: 'number',
        description: 'Scale factor (2x or 4x, default 2).',
        minimum: 2,
        maximum: 4,
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'image_upscale',
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
