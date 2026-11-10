/**
 * DSH Cordis plugin: tech_stack
 *
 * Detect the technology stack used by a company's website.
 * @module @sandbaseai/dsh-plugin-tech-stack
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_tech_stack'

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

/** SandBase model / API id called by `tech_stack`. */
const MODEL = 'dataforseo/v3/domain_analytics/technologies/domain_technologies/live'

/** Arguments of the `tech_stack` tool. */
interface Args {
  url: string
}

function hostname(url: string): string {
  try {
    return new URL(url.includes('://') ? url : 'https://' + url).hostname
  } catch {
    return url
  }
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    target: hostname(args.url),
  }
}

/**
 * Register the `tech_stack` tool with the harness tools service.
 * The tool runs `dataforseo/v3/domain_analytics/technologies/domain_technologies/live` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'tech_stack',
      description: 'Detect the technology stack used by a company\'s website.',
      parameters: {
      url: {
        type: 'string',
        required: true,
        description: 'Company website URL.',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'tech_stack',
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
