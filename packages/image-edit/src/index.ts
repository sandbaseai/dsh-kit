/**
 * DSH Cordis plugin: image_edit
 *
 * Edit images: erase objects, inpaint, or modify specific regions.
 * This is an asynchronous operation. The tool returns a task ID;
 * use the result endpoint to check completion status.
 * @module @sandbaseai/dsh-plugin-image-edit
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_image_edit'

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

/** SandBase model / API id called by `image_edit`. */
const MODEL = 'bfl/flux-2/dev/edit'

/** Arguments of the `image_edit` tool. */
interface Args {
  imageUrl: string
  prompt: string
  maskUrl?: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    images: [args.imageUrl],
    prompt: args.prompt,
  }
}

/**
 * Register the `image_edit` tool with the harness tools service.
 * The tool runs `bfl/flux-2/dev/edit` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'image_edit',
      description: 'Edit images: erase objects, inpaint, or modify specific regions.',
      parameters: {
      imageUrl: {
        type: 'string',
        required: true,
        description: 'URL of the image to edit.',
      },
      prompt: {
        type: 'string',
        required: true,
        description: 'Description of the edit to apply.',
      },
      maskUrl: {
        type: 'string',
        description: 'URL of mask image (white = edit area).',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'image_edit',
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
