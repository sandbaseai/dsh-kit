/**
 * DSH Cordis plugin: reddit_comments
 *
 * Get comments for a Reddit post.
 * @module @sandbaseai/dsh-plugin-reddit-comments
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_reddit_comments'

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

/** SandBase model / API id called by `reddit_comments`. */
const MODEL = 'reddit/app/post-comments'

/** Arguments of the `reddit_comments` tool. */
interface Args {
  postUrl: string
  maxComments?: number
}

/** Accept a Reddit post URL, a bare post id or a t3_ fullname. */
function redditPostId(value: string): string {
  const id = /\/comments\/([a-z0-9]+)/i.exec(value)?.[1] ?? value.trim()
  return id.startsWith('t3_') ? id : `t3_${id}`
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    post_id: redditPostId(args.postUrl),
  }
}

/**
 * Register the `reddit_comments` tool with the harness tools service.
 * The tool runs `reddit/app/post-comments` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'reddit_comments',
      description: 'Get comments for a Reddit post.',
      parameters: {
      postUrl: {
        type: 'string',
        required: true,
        description: 'Reddit post URL.',
      },
      maxComments: {
        type: 'number',
        description: 'Max comments (default 50).',
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
          toolName: 'reddit_comments',
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
