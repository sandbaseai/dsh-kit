import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import './check-bundle.mjs'

const root = resolve(import.meta.dirname, '..')
const destination = resolve(root, 'dist/bundle')
await mkdir(destination, { recursive: true })
const result = spawnSync('npm', ['pack', '--ignore-scripts', '--pack-destination', destination], {
  cwd: resolve(root, 'bundle'),
  stdio: 'inherit',
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
