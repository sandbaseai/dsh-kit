/**
 * DSH Cordis plugin: linkedin_posts
 *
 * Get recent posts from a LinkedIn profile.
 * @module @sandbaseai/dsh-plugin-linkedin-posts
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_linkedin_posts'

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

/** SandBase model / API id called by `linkedin_posts`. */
const MODEL = 'linkedin/profile-posts-thin'

/** Arguments of the `linkedin_posts` tool. */
interface Args {
  profileUrl: string
  maxPosts?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    url: args.profileUrl,
    limit: args.maxPosts !== undefined ? Math.max(args.maxPosts, 10) : undefined,
  }
}

/**
 * Register the `linkedin_posts` tool with the harness tools service.
 * The tool runs `linkedin/profile-posts-thin` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'linkedin_posts',
      description: 'Get recent posts from a LinkedIn profile.',
      parameters: {
      profileUrl: {
        type: 'string',
        required: true,
        description: 'LinkedIn profile URL.',
      },
      maxPosts: {
        type: 'number',
        description: 'Max posts (default 10).',
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
          toolName: 'linkedin_posts',
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
