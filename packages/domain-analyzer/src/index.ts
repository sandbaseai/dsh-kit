/**
 * DSH Cordis plugin: domain_analyzer
 *
 * Analyze a domain for availability, registration info, and startup potential.
 * @module @sandbaseai/dsh-plugin-domain-analyzer
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_domain_analyzer'

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

/** SandBase model / API id called by `domain_analyzer`. */
const MODEL = 'dataforseo/v3/domain_analytics/whois/overview/live'

/** Arguments of the `domain_analyzer` tool. */
interface Args {
  domain: string
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    filters: [['domain', '=', args.domain]],
    limit: 1,
  }
}

/**
 * Register the `domain_analyzer` tool with the harness tools service.
 * The tool runs `dataforseo/v3/domain_analytics/whois/overview/live` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'domain_analyzer',
      description: 'Analyze a domain for availability, registration info, and startup potential.',
      parameters: {
      domain: {
        type: 'string',
        required: true,
        description: 'Domain name to analyze.',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'domain_analyzer',
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
