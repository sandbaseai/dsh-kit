/**
 * DSH Cordis plugin: avatar_heygen
 *
 * Generate talking avatar videos using HeyGen.
 * This is an asynchronous operation. The tool returns a task ID;
 * use the result endpoint to check completion status.
 * @module @sandbaseai/dsh-plugin-avatar-heygen
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_avatar_heygen'

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

/** SandBase model / API id called by `avatar_heygen`. */
const MODEL = 'heygen/avatar5/digital-twin'

/** Arguments of the `avatar_heygen` tool. */
interface Args {
  text: string
  avatarId?: string
  voiceId?: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    prompt: args.text,
    avatar: args.avatarId,
    voice: args.voiceId,
  }
}

/**
 * Register the `avatar_heygen` tool with the harness tools service.
 * The tool runs `heygen/avatar5/digital-twin` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'avatar_heygen',
      description: 'Generate talking avatar videos using HeyGen.',
      parameters: {
      text: {
        type: 'string',
        required: true,
        description: 'Script text for the avatar to speak.',
      },
      avatarId: {
        type: 'string',
        description: 'Avatar ID or name.',
      },
      voiceId: {
        type: 'string',
        description: 'Voice ID for the avatar.',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'avatar_heygen',
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
