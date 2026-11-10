/**
 * DSH Cordis plugin: image_gen_seedream
 *
 * Generate images using ByteDance Seedream 5.0.
 * This is an asynchronous operation. The tool returns a task ID;
 * use the result endpoint to check completion status.
 * @module @sandbaseai/dsh-plugin-image-gen-seedream
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_image_gen_seedream'

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

/** SandBase model / API id called by `image_gen_seedream`. */
const MODEL = 'bytedance/seedream/5.0/lite'

/** Arguments of the `image_gen_seedream` tool. */
interface Args {
  prompt: string
  aspectRatio?: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    prompt: args.prompt,
    aspect_ratio: args.aspectRatio,
  }
}

/**
 * Register the `image_gen_seedream` tool with the harness tools service.
 * The tool runs `bytedance/seedream/5.0/lite` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'image_gen_seedream',
      description: 'Generate images using ByteDance Seedream 5.0.',
      parameters: {
      prompt: {
        type: 'string',
        required: true,
        description: 'Image generation prompt.',
      },
      aspectRatio: {
        type: 'string',
        description: 'Aspect ratio.',
        enum: ['1:1', '16:9', '9:16', '4:3'],
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'image_gen_seedream',
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
