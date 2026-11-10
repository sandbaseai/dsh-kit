/**
 * DSH Cordis plugin: reddit_posts
 *
 * Search Reddit posts by query or subreddit.
 * @module @sandbaseai/dsh-plugin-reddit-posts
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_reddit_posts'

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

/** SandBase model / API id called by `reddit_posts`. */
const MODEL = 'reddit/search'

/** Arguments of the `reddit_posts` tool. */
interface Args {
  query: string
  maxResults?: number
  sortBy?: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    keyword: args.query,
  }
}

/**
 * Register the `reddit_posts` tool with the harness tools service.
 * The tool runs `reddit/search` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'reddit_posts',
      description: 'Search Reddit posts by query or subreddit.',
      parameters: {
      query: {
        type: 'string',
        required: true,
        description: 'Search query or subreddit name (with r/ prefix).',
      },
      maxResults: {
        type: 'number',
        description: 'Max posts (default 25).',
        minimum: 1,
        maximum: 100,
      },
      sortBy: {
        type: 'string',
        description: 'Sort order.',
        enum: ['hot', 'new', 'top', 'rising'],
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'reddit_posts',
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
