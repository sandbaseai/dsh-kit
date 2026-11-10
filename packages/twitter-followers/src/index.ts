/**
 * DSH Cordis plugin: twitter_followers
 *
 * Get followers list for a Twitter/X account.
 * @module @sandbaseai/dsh-plugin-twitter-followers
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_twitter_followers'

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

/** SandBase model / API id called by `twitter_followers`. */
const MODEL = 'twitter/web/user-followers'

/** Arguments of the `twitter_followers` tool. */
interface Args {
  username: string
  maxResults?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    screen_name: args.username.replace(/^@/, ''),
  }
}

/**
 * Register the `twitter_followers` tool with the harness tools service.
 * The tool runs `twitter/web/user-followers` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'twitter_followers',
      description: 'Get followers list for a Twitter/X account.',
      parameters: {
      username: {
        type: 'string',
        required: true,
        description: 'Twitter/X username (without @).',
      },
      maxResults: {
        type: 'number',
        description: 'Max followers (default 50).',
        minimum: 1,
        maximum: 200,
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'twitter_followers',
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
