/**
 * DSH Cordis plugin: tts_elevenlabs
 *
 * Convert text to speech using ElevenLabs with natural voices.
 * This is an asynchronous operation. The tool returns a task ID;
 * use the result endpoint to check completion status.
 * @module @sandbaseai/dsh-plugin-tts-elevenlabs
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_tts_elevenlabs'

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

/** SandBase model / API id called by `tts_elevenlabs`. */
const MODEL = 'elevenlabs/v4-turbo'

/** Arguments of the `tts_elevenlabs` tool. */
interface Args {
  text: string
  voice?: string
  language?: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    text: args.text,
    voice: args.voice,
    language_code: args.language,
  }
}

/**
 * Register the `tts_elevenlabs` tool with the harness tools service.
 * The tool runs `elevenlabs/v4-turbo` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'tts_elevenlabs',
      description: 'Convert text to speech using ElevenLabs with natural voices.',
      parameters: {
      text: {
        type: 'string',
        required: true,
        description: 'Text to convert to speech.',
      },
      voice: {
        type: 'string',
        description: 'Voice ID or name (e.g. Adam, Rachel, Antoni).',
      },
      language: {
        type: 'string',
        description: 'Language code (auto-detected if not specified).',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'tts_elevenlabs',
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
