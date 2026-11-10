/**
 * DSH Cordis plugin: company_jobs
 *
 * Search for job postings at a specific company.
 * @module @sandbaseai/dsh-plugin-company-jobs
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_company_jobs'

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

/** SandBase model / API id called by `company_jobs`. */
const MODEL = 'linkedin/jobs'

/** Arguments of the `company_jobs` tool. */
interface Args {
  company: string
  title?: string
  maxResults?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    query: args.title || args.company,
    company: args.company,
    limit: args.maxResults,
  }
}

/**
 * Register the `company_jobs` tool with the harness tools service.
 * The tool runs `linkedin/jobs` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'company_jobs',
      description: 'Search for job postings at a specific company.',
      parameters: {
      company: {
        type: 'string',
        required: true,
        description: 'Company name or domain.',
      },
      title: {
        type: 'string',
        description: 'Job title filter.',
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
          toolName: 'company_jobs',
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
