/**
 * DSH Cordis plugin: web_screenshot
 *
 * Capture a screenshot of a web page.
 * @module @sandbaseai/dsh-plugin-web-screenshot
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_web_screenshot'

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

/** SandBase model / API id called by `web_screenshot`. */
const MODEL = 'dataforseo/v3/on_page/page_screenshot'

/** Arguments of the `web_screenshot` tool. */
interface Args {
  url: string
  fullPage?: boolean
  viewportWidth?: number
  viewportHeight?: number
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    url: args.url,
    full_page_screenshot: args.fullPage,
    browser_screen_width: args.viewportWidth,
    browser_screen_height: args.viewportHeight,
  }
}

/**
 * Register the `web_screenshot` tool with the harness tools service.
 * The tool runs `dataforseo/v3/on_page/page_screenshot` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'web_screenshot',
      description: 'Capture a screenshot of a web page.',
      parameters: {
      url: {
        type: 'string',
        required: true,
        description: 'URL to screenshot.',
      },
      fullPage: {
        type: 'boolean',
        description: 'Capture full scrollable page.',
      },
      viewportWidth: {
        type: 'number',
        description: 'Viewport width (default 1280).',
      },
      viewportHeight: {
        type: 'number',
        description: 'Viewport height (default 800).',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'web_screenshot',
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
