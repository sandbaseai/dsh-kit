import { mkdir, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
if (!process.env.npm_execpath) throw new Error('Run this script through pnpm pack:plugins')
const destination = resolve(root, 'dist/packages')
await mkdir(destination, { recursive: true })
for (const name of await readdir(resolve(root, 'packages'))) {
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'pack', '--pack-destination', destination], {
    cwd: resolve(root, 'packages', name),
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
