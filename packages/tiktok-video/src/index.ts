/**
 * DSH Cordis plugin: tiktok_video
 *
 * Get metadata for a TikTok video by URL or ID.
 * @module @sandbaseai/dsh-plugin-tiktok-video
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_tiktok_video'

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

/** SandBase model / API id called by `tiktok_video`. */
const MODEL = 'tiktok/web/post-detail'

/** Arguments of the `tiktok_video` tool. */
interface Args {
  videoUrl: string
}

/** Accept a TikTok video URL or a bare numeric video id. */
function tiktokVideoId(value: string): string {
  return /\/video\/(\d+)/.exec(value)?.[1] ?? value.trim()
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    itemId: tiktokVideoId(args.videoUrl),
  }
}

/**
 * Register the `tiktok_video` tool with the harness tools service.
 * The tool runs `tiktok/web/post-detail` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'tiktok_video',
      description: 'Get metadata for a TikTok video by URL or ID.',
      parameters: {
      videoUrl: {
        type: 'string',
        required: true,
        description: 'TikTok video URL or video ID.',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'tiktok_video',
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
