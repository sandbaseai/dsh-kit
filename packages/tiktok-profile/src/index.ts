/**
 * DSH Cordis plugin: tiktok_profile
 *
 * Get TikTok profile data and post history.
 * @module @sandbaseai/dsh-plugin-tiktok-profile
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_tiktok_profile'

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

/** SandBase model / API id called by `tiktok_profile`. */
const MODEL = 'tiktok/web/user-profile'

/** Arguments of the `tiktok_profile` tool. */
interface Args {
  username: string
  maxPosts?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    uniqueId: args.username.replace(/^@/, ''),
  }
}

/**
 * Register the `tiktok_profile` tool with the harness tools service.
 * The tool runs `tiktok/web/user-profile` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'tiktok_profile',
      description: 'Get TikTok profile data and post history.',
      parameters: {
      username: {
        type: 'string',
        required: true,
        description: 'TikTok username (without @).',
      },
      maxPosts: {
        type: 'number',
        description: 'Max posts (default 20).',
        minimum: 1,
        maximum: 50,
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'tiktok_profile',
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
