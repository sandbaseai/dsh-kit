/**
 * DSH Cordis plugin: image_gen_flux
 *
 * Generate images using Black Forest Labs Flux Pro model.
 * This is an asynchronous operation. The tool returns a task ID;
 * use the result endpoint to check completion status.
 * @module @sandbaseai/dsh-plugin-image-gen-flux
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, runSandbaseModel } from '@sandbaseai/dsh-plugin-shared'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh_plugin_image_gen_flux'

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

/** SandBase model / API id called by `image_gen_flux`. */
const MODEL = 'bfl/flux-2/pro'

/** Arguments of the `image_gen_flux` tool. */
interface Args {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
}

const ASPECTS = ['21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16']

/** Map width/height to the closest aspect ratio supported upstream. */
function aspectRatio(width?: number, height?: number): string | undefined {
  if (!width && !height) return undefined
  const target = (width ?? 1024) / (height ?? 1024)
  let best = '1:1'
  for (const ratio of ASPECTS) {
    const [w, h] = ratio.split(':').map(Number)
    const [bw, bh] = best.split(':').map(Number)
    if (Math.abs(Math.log(w / h / target)) < Math.abs(Math.log(bw / bh / target))) best = ratio
  }
  return best
}

/** Map tool arguments to the input fields of {@link MODEL}. */
function toInput(args: Args): Record<string, unknown> {
  return {
    prompt: args.negativePrompt ? `${args.prompt}. Avoid: ${args.negativePrompt}` : args.prompt,
    aspect_ratio: aspectRatio(args.width, args.height) ?? '1:1',
  }
}

/**
 * Register the `image_gen_flux` tool with the harness tools service.
 * The tool runs `bfl/flux-2/pro` through SandBase `POST /v1/run`
 * (see runSandbaseModel) and returns the run result as JSON.
 */
export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'image_gen_flux',
      description: 'Generate images using Black Forest Labs Flux Pro model.',
      parameters: {
      prompt: {
        type: 'string',
        required: true,
        description: 'Image generation prompt. Be detailed and specific.',
      },
      negativePrompt: {
        type: 'string',
        description: 'What to avoid in the image.',
      },
      width: {
        type: 'number',
        description: 'Image width (default 1024).',
      },
      height: {
        type: 'number',
        description: 'Image height (default 1024).',
      },
    },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const result = await runSandbaseModel(ctx, {
          toolName: 'image_gen_flux',
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
