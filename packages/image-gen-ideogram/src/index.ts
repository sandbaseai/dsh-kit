/**
 * DSH Cordis plugin: image_gen_ideogram
 *
 * Generate images with text rendering using Ideogram V3.
 * This is an asynchronous operation. The tool returns a task ID;
 * use the result endpoint to check completion status.
 * @module @sandbaseai/dsh-plugin-image-gen-ideogram
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_image_gen_ideogram'

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

/** SandBase model / API id called by `image_gen_ideogram`. */
const MODEL = 'ideogram-ai/ideogram-v3'

/** Arguments of the `image_gen_ideogram` tool. */
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
 * Register the `image_gen_ideogram` tool with the harness tools service.
 * The tool runs `ideogram-ai/ideogram-v3` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'image_gen_ideogram',
      description: 'Generate images with text rendering using Ideogram V3.',
      parameters: {
      prompt: {
        type: 'string',
        required: true,
        description: 'Image generation prompt. Ideogram excels at text rendering.',
      },
      aspectRatio: {
        type: 'string',
        description: 'Aspect ratio.',
        enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'image_gen_ideogram',
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
