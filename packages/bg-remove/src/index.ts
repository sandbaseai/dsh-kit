/**
 * DSH Cordis plugin: bg_remove
 *
 * Remove or replace the background of an image.
 * This is an asynchronous operation. The tool returns a task ID;
 * use the result endpoint to check completion status.
 * @module @sandbaseai/dsh-plugin-bg-remove
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_bg_remove'

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

/** SandBase model / API id called by `bg_remove`. */
const MODEL = 'bfl/flux-2/dev/edit'

/** Arguments of the `bg_remove` tool. */
interface Args {
  imageUrl: string
  newBackground?: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    images: [args.imageUrl],
    prompt: args.newBackground
      ? `Replace the background with: ${args.newBackground}. Keep the main subject unchanged.`
      : 'Remove the background and place the main subject on a plain white background. Keep the subject unchanged.',
  }
}

/**
 * Register the `bg_remove` tool with the harness tools service.
 * The tool runs `bfl/flux-2/dev/edit` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'bg_remove',
      description: 'Remove or replace the background of an image.',
      parameters: {
      imageUrl: {
        type: 'string',
        required: true,
        description: 'URL of the image.',
      },
      newBackground: {
        type: 'string',
        description: 'Description of new background (omit for transparent).',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'bg_remove',
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
