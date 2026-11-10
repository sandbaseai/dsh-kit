/**
 * DSH Cordis plugin: youtube_transcript
 *
 * Get the transcript/captions for a YouTube video.
 * @module @sandbaseai/dsh-plugin-youtube-transcript
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_youtube_transcript'

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

/** SandBase model / API id called by `youtube_transcript`. */
const MODEL = 'youtube/web-v2/video-captions'

/** Arguments of the `youtube_transcript` tool. */
interface Args {
  videoUrl: string
  language?: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    video_url: args.videoUrl,
    language_code: args.language ?? 'en',
    format: 'txt',
  }
}

/**
 * Register the `youtube_transcript` tool with the harness tools service.
 * The tool runs `youtube/web-v2/video-captions` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'youtube_transcript',
      description: 'Get the transcript/captions for a YouTube video.',
      parameters: {
      videoUrl: {
        type: 'string',
        required: true,
        description: 'YouTube video URL.',
      },
      language: {
        type: 'string',
        description: 'Language code for captions (e.g. en).',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'youtube_transcript',
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
