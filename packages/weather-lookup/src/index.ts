/**
 * DSH Cordis plugin: weather_lookup
 *
 * Get current weather and forecast for a location.
 * @module @sandbaseai/dsh-plugin-weather-lookup
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_weather_lookup'

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

/** SandBase model / API id called by `weather_lookup`. */
const MODEL = 'accuweather/weather'

/** Arguments of the `weather_lookup` tool. */
interface Args {
  location: string
  days?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    city: args.location,
  }
}

/**
 * Register the `weather_lookup` tool with the harness tools service.
 * The tool runs `accuweather/weather` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'weather_lookup',
      description: 'Get current weather and forecast for a location.',
      parameters: {
      location: {
        type: 'string',
        required: true,
        description: 'City name or coordinates.',
      },
      days: {
        type: 'number',
        description: 'Forecast days (default 1, max 7).',
        minimum: 1,
        maximum: 7,
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'weather_lookup',
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
