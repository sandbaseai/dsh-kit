/**
 * DSH Cordis plugin: linkedin_company
 *
 * Get employee list for a LinkedIn company page.
 * @module @sandbaseai/dsh-plugin-linkedin-company
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_linkedin_company'

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

/** SandBase model / API id called by `linkedin_company`. */
const MODEL = 'linkedin/company-employees'

/** Arguments of the `linkedin_company` tool. */
interface Args {
  companyUrl: string
  maxResults?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    company: args.companyUrl,
    limit: args.maxResults !== undefined ? Math.min(args.maxResults, 10) : undefined,
  }
}

/**
 * Register the `linkedin_company` tool with the harness tools service.
 * The tool runs `linkedin/company-employees` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'linkedin_company',
      description: 'Get employee list for a LinkedIn company page.',
      parameters: {
      companyUrl: {
        type: 'string',
        required: true,
        description: 'LinkedIn company page URL.',
      },
      maxResults: {
        type: 'number',
        description: 'Max employees (default 50).',
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
          toolName: 'linkedin_company',
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
