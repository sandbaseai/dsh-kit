/**
 * Credential resolution for DSH plugins.
 * Reads API keys from ctx.credentials with fallback to environment variables.
 */

import type { Context } from '@deepseek-ai/cordis'

export interface CredentialRef {
  /** Provider name (e.g. 'sandbase', 'apify', 'openai'). */
  provider: string
  /** Key name within the provider. */
  key: string
}

/** Built-in credential keys for common providers. */
export const CREDENTIAL_KEYS = {
  sandbase: { apiKey: 'api_key' },
  apify: { apiKey: 'api_key' },
  apollo: { apiKey: 'api_key' },
  akta: { apiKey: 'api_key' },
  defillama: { apiKey: 'api_key' },
  contextDev: { apiKey: 'api_key' },
  strale: { apiKey: 'api_key' },
  exa: { apiKey: 'api_key' },
  firecrawl: { apiKey: 'api_key' },
  tavily: { apiKey: 'api_key' },
  google: { apiKey: 'api_key' },
  openai: { apiKey: 'api_key' },
  anthropic: { apiKey: 'api_key' },
  elevenlabs: { apiKey: 'api_key' },
  heygen: { apiKey: 'api_key' },
  bfl: { apiKey: 'api_key' },
  stability: { apiKey: 'api_key' },
  ideogram: { apiKey: 'api_key' },
  kwaivgi: { apiKey: 'api_key' },
  bytedance: { apiKey: 'api_key' },
  tencent: { apiKey: 'api_key' },
  pika: { apiKey: 'api_key' },
  pixverse: { apiKey: 'api_key' },
  vidu: { apiKey: 'api_key' },
  recraft: { apiKey: 'api_key' },
  bria: { apiKey: 'api_key' },
  minimax: { apiKey: 'api_key' },
  xai: { apiKey: 'api_key' },
  zhipu: { apiKey: 'api_key' },
  alibaba: { apiKey: 'api_key' },
  tripo3d: { apiKey: 'api_key' },
  meshy: { apiKey: 'api_key' },
} as const satisfies Record<string, Record<string, string>>

/**
 * Resolve a credential from ctx.credentials service.
 * Falls back to environment variable if credentials service is not available.
 */
export async function resolveCredential(
  ctx: Context,
  provider: string,
  key: string,
): Promise<string> {
  // Try credentials service
  try {
    const creds = ctx.get('credentials') as { resolve: (ref: { provider: string; key: string }) => Promise<{ value: string } | undefined> } | undefined
    if (creds) {
      const resolved = await creds.resolve({ provider, key })
      if (resolved?.value) return resolved.value
    }
  } catch {
    // credentials service not available, fall through to env
  }

  // Fallback: environment variable
  const envKey = `${provider.toUpperCase()}_${key.toUpperCase()}`.replace(/[^A-Z0-9_]/g, '_')
  const envValue = process.env[envKey]
  if (envValue) return envValue

  // Try SANDABASE_ prefixed
  const sandbaseKey = `SANDABASE_${envKey}`
  const sandbaseValue = process.env[sandbaseKey]
  if (sandbaseValue) return sandbaseValue

  throw new Error(
    `Credential not found: ${provider}/${key}. ` +
    `Set ${envKey} or ${sandbaseKey} environment variable, ` +
    `or configure via ctx.credentials.`,
  )
}