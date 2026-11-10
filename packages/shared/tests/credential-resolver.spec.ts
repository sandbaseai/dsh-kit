import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { resolveCredential } from '../src/credential-resolver.ts'

const emptyCtx = { get: () => undefined } as unknown as Context

describe('resolveCredential', () => {
  beforeEach(() => {
    for (const name of ['SANDBASE_API_KEY', 'APIFY_API_KEY', 'SANDBASE_APIFY_API_KEY', 'SANDABASE_APIFY_API_KEY']) {
      vi.stubEnv(name, '')
    }
  })
  afterEach(() => vi.unstubAllEnvs())

  it('prefers ctx.credentials', async () => {
    vi.stubEnv('SANDBASE_API_KEY', 'from-env')
    const ctx = { get: () => ({ resolve: async () => ({ value: 'from-ctx' }) }) } as unknown as Context
    await expect(resolveCredential(ctx, 'sandbase', 'api_key')).resolves.toBe('from-ctx')
  })

  it('reads SANDBASE_API_KEY for provider sandbase', async () => {
    vi.stubEnv('SANDBASE_API_KEY', 'sb')
    await expect(resolveCredential(emptyCtx, 'sandbase', 'api_key')).resolves.toBe('sb')
  })

  it('reads SANDBASE_APIFY_API_KEY for provider apify', async () => {
    vi.stubEnv('SANDBASE_APIFY_API_KEY', 'apify')
    await expect(resolveCredential(emptyCtx, 'apify', 'api_key')).resolves.toBe('apify')
  })

  it('still reads the legacy SANDABASE_ prefix', async () => {
    vi.stubEnv('SANDABASE_APIFY_API_KEY', 'legacy')
    await expect(resolveCredential(emptyCtx, 'apify', 'api_key')).resolves.toBe('legacy')
  })

  it('names only the correct variables when missing', async () => {
    const error = await resolveCredential(emptyCtx, 'apify', 'api_key').catch(err => err as Error)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('SANDBASE_APIFY_API_KEY')
    expect((error as Error).message).not.toContain('SANDABASE')
  })
})
