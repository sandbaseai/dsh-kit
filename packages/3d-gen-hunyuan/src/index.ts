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
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

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

/** SandBase model / API id called by `3d_gen_hunyuan`. */
const MODEL = 'tencent/hunyuan-3d/3.1/pro/text-to-3d'

/** Arguments of the `3d_gen_hunyuan` tool. */
interface Args {
  prompt: string
  quality?: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    prompt: args.prompt,
  }
}

/**
 * Register the `3d_gen_hunyuan` tool with the harness tools service.
 * The tool runs `tencent/hunyuan-3d/3.1/pro/text-to-3d` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
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
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: '3d_gen_hunyuan',
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
