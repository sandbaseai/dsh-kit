/**
 * Plugin skeleton factory — generates a complete DSH Cordis plugin
 * from a minimal definition, reducing boilerplate for simple API wrappers.
 */

import type { Context } from '@deepseek-ai/cordis'
import type z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { createFetchClient, type FetchClient } from './fetch-client.ts'
import { resolveCredential } from './credential-resolver.ts'
import { handleUpstreamError } from './error-handler.ts'

/** Minimal definition for a simple API-wrapper plugin. */
export interface PluginDefinition {
  /** Tool name shown to the model (snake_case). */
  toolName: string
  /** Human-readable description for model decision-making. */
  description: string
  /** Upstream API base URL. */
  baseUrl: string
  /** Credential provider name. */
  credentialProvider: string
  /** Credential key name. */
  credentialKey?: string
  /** Default request timeout in ms. */
  timeoutMs?: number
  /** HTTP method for the API call. */
  method?: 'GET' | 'POST'
  /** API endpoint path (can include {param} placeholders). */
  endpointPath: string
  /** Tool parameters definition. */
  parameters: Record<string, {
    type: string
    required?: boolean
    description: string
    default?: unknown
    enum?: string[]
  }>
  /** Transform the API response into the tool's return value. */
  transformResponse?: (data: unknown) => unknown
  /** Build the query string or body from args. */
  buildRequest?: (args: Record<string, unknown>) => { path: string; body?: unknown }
  /** Output renderer. */
  renderOutput?: (args: Record<string, unknown>, value: unknown) => Array<{ type: string; text: string }>
}

/** Plugin config interface. */
export interface PluginConfig {
  enabled?: boolean
  timeoutMs?: number
  apiKey?: string
}

/** Create a complete DSH plugin from a minimal definition. */
export function createPlugin(def: PluginDefinition) {
  const configSchema = {
    enabled: { type: 'boolean', default: true, description: 'Enable this plugin' },
    timeoutMs: { type: 'number', default: def.timeoutMs ?? 30_000, description: 'Request timeout in ms' },
    apiKey: { type: 'string', default: '', description: 'API key override' },
  }

  return {
    name: `dsh-plugin-${def.toolName.replace(/_/g, '-')}`,
    inject: ['tools', 'web', 'systemPrompt'] as const,

    apply(ctx: Context, config: { enabled?: boolean; timeoutMs?: number; apiKey?: string } = {}) {
      if (config.enabled === false) return

      void (async () => {
        const apiKey = config.apiKey || await resolveCredential(ctx, def.credentialProvider, def.credentialKey ?? 'api_key')
        const client = createFetchClient({
          baseUrl: def.baseUrl,
          timeoutMs: config.timeoutMs ?? def.timeoutMs ?? 30_000,
          defaultHeaders: { Authorization: `Bearer ${apiKey}` },
        })

        ctx.tools.register(defineTool({
          name: def.toolName,
          description: def.description,
          parameters: def.parameters,
          output: {
            schema: { type: 'object' },
            render: def.renderOutput ?? ((_args, value) => [
              { type: 'text', text: JSON.stringify(value, null, 2) },
            ]),
          },
          async execute(args, { signal }) {
            try {
              const { path, body } = def.buildRequest
                ? def.buildRequest(args as Record<string, unknown>)
                : { path: def.endpointPath, body: undefined }

              let data: unknown
              if (def.method === 'POST') {
                data = await client.post(path, body ?? args, signal)
              } else {
                // Build query string for GET
                const params = new URLSearchParams()
                for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
                  if (value !== undefined && value !== null && value !== '') {
                    params.append(key, String(value))
                  }
                }
                const qs = params.toString()
                data = await client.get(qs ? `${path}?${qs}` : path, signal)
              }

              return def.transformResponse ? def.transformResponse(data) : data
            } catch (err) {
              handleUpstreamError(err, def.toolName)
            }
          },
        }))
      })()
    },
  }
}