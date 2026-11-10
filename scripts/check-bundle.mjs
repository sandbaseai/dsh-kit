import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const bundle = resolve(root, 'bundle')
const manifest = JSON.parse(readFileSync(resolve(bundle, 'package.json'), 'utf8'))
const patch = readFileSync(resolve(bundle, manifest.dsh.bundle.patch), 'utf8')
assert.equal(manifest.name, '@sandbaseai/dsh-kit')
assert.equal(manifest.publishConfig.tag, 'next')
assert.equal((patch.match(/name: '@deepseek-ai\/dsh-mcp-client'/g) ?? []).length, 1)
assert.match(patch, /transport: streamable-http/)
assert.match(patch, /process.env.SANDBASE_API_KEY/)
assert.match(patch, /failOnStartupError: true/)
assert.doesNotMatch(patch, /npm_|sk-[a-zA-Z0-9]{16}|Bearer [a-zA-Z0-9]{16}/)
for (const file of manifest.files) readFileSync(resolve(bundle, file))
console.log('Bundle manifest, single MCP entry, and credential reference checks passed.')
