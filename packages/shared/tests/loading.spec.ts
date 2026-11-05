import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '../..')
const directories = readdirSync(root).filter(name => name !== 'shared')

describe('standalone bundles', () => {
  it.each(directories)('%s has a loadable artifact and bundle manifest', async name => {
    const directory = resolve(root, name)
    const manifest = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'))
    expect(manifest.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(manifest.files).toContain('cordis.patch.yml')
    expect(manifest.dependencies?.['@sandbaseai/dsh-plugin-shared']).toBeUndefined()
    const plugin = await import(pathToFileURL(resolve(directory, 'lib/index.js')).href)
    const registered: { name: string }[] = []
    await plugin.apply({
      get: () => undefined,
      tools: { register: (tool: { name: string }) => { registered.push(tool) } },
    }, { toolPrefix: 'sandbase_' })
    expect(registered.length).toBeGreaterThan(0)
    expect(registered.every(tool => tool.name.startsWith('sandbase_'))).toBe(true)
  })
})
