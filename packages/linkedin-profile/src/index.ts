/**
 * DSH Cordis plugin: linkedin_profile
 *
 * Search LinkedIn profiles by name.
 * @module @sandbaseai/dsh-plugin-linkedin-profile
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_linkedin_profile'

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

/** SandBase model / API id called by `linkedin_profile`. */
const MODEL = 'linkedin/search-profiles-thin'

/** Arguments of the `linkedin_profile` tool. */
interface Args {
  name: string
  maxResults?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    query: args.name,
  }
}

/**
 * Register the `linkedin_profile` tool with the harness tools service.
 * The tool runs `linkedin/search-profiles-thin` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'linkedin_profile',
      description: 'Search LinkedIn profiles by name.',
      parameters: {
      name: {
        type: 'string',
        required: true,
        description: 'Person name to search on LinkedIn.',
      },
      maxResults: {
        type: 'number',
        description: 'Max results (default 10).',
        minimum: 1,
        maximum: 50,
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'linkedin_profile',
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
