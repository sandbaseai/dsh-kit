/**
 * DSH Cordis plugin: industry_search
 *
 * Search for companies within a specific industry.
 * @module @sandbaseai/dsh-plugin-industry-search
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_industry_search'

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

/** SandBase model / API id called by `industry_search`. */
const MODEL = 'apollo/company-search'

/** Arguments of the `industry_search` tool. */
interface Args {
  industry: string
  maxResults?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    'q_organization_keyword_tags[]': [args.industry],
    per_page: args.maxResults,
  }
}

/**
 * Register the `industry_search` tool with the harness tools service.
 * The tool runs `apollo/company-search` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'industry_search',
      description: 'Search for companies within a specific industry.',
      parameters: {
      industry: {
        type: 'string',
        required: true,
        description: 'Industry name or keyword.',
      },
      maxResults: {
        type: 'number',
        description: 'Max results (default 20).',
        minimum: 1,
        maximum: 100,
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'industry_search',
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
