import { build } from 'esbuild'
import { cp, mkdir, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
for (const name of await readdir(resolve(root, 'packages'))) {
  const directory = resolve(root, 'packages', name)
  await build({
    entryPoints: [resolve(directory, 'src/index.ts')],
    outfile: resolve(directory, 'lib/index.js'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    external: ['@deepseek-ai/*'],
    alias: { '@sandbaseai/dsh-plugin-shared': resolve(root, 'packages/shared/src/index.ts') },
  })
  await mkdir(resolve(directory, 'lib/types'), { recursive: true })
  await cp(resolve(root, 'dist/types', name, 'src'), resolve(directory, 'lib/types'), { recursive: true })
  console.log(`Built ${name}`)
}
