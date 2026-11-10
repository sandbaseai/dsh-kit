/**
 * DSH Cordis plugin: translate
 *
 * Translate text between languages.
 * @module @sandbaseai/dsh-plugin-translate
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_translate'

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

/** SandBase model / API id called by `translate`. */
const MODEL = 'tiktok/app-v3/content-translate'

/** Arguments of the `translate` tool. */
interface Args {
  text: string
  from?: string
  to: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    src_content: args.text,
    trg_lang: args.to,
  }
}

/**
 * Register the `translate` tool with the harness tools service.
 * The tool runs `tiktok/app-v3/content-translate` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'translate',
      description: 'Translate text between languages.',
      parameters: {
      text: {
        type: 'string',
        required: true,
        description: 'Text to translate.',
      },
      from: {
        type: 'string',
        description: 'Source language code (auto-detect if omitted).',
      },
      to: {
        type: 'string',
        required: true,
        description: 'Target language code (e.g. en, zh, es, fr).',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'translate',
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
