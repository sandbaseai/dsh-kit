/**
 * DSH Cordis plugin: video_gen_veo
 *
 * Generate videos using Google Veo 3.
 * This is an asynchronous operation. The tool returns a task ID;
 * use the result endpoint to check completion status.
 * @module @sandbaseai/dsh-plugin-video-gen-veo
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_video_gen_veo'

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

/** SandBase model / API id called by `video_gen_veo`. */
const MODEL = 'google/veo3.1/lite/text-to-video'

/** Arguments of the `video_gen_veo` tool. */
interface Args {
  prompt: string
  duration?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    prompt: args.prompt,
    duration: args.duration !== undefined ? (args.duration <= 4 ? 4 : args.duration <= 6 ? 6 : 8) : undefined,
  }
}

/**
 * Register the `video_gen_veo` tool with the harness tools service.
 * The tool runs `google/veo3.1/lite/text-to-video` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'video_gen_veo',
      description: 'Generate videos using Google Veo 3.',
      parameters: {
      prompt: {
        type: 'string',
        required: true,
        description: 'Video generation prompt.',
      },
      duration: {
        type: 'number',
        description: 'Duration in seconds (default 5).',
        minimum: 2,
        maximum: 10,
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'video_gen_veo',
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
