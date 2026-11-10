/**
 * Smoke test: verify all plugins export correctly and can be loaded.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

const PLUGINS_DIR = path.resolve(__dirname, '..', '..')

// Get all plugin directories (excluding shared)
const pluginDirs = fs.readdirSync(PLUGINS_DIR)
  .filter(d => d !== 'shared'
    && fs.statSync(path.join(PLUGINS_DIR, d)).isDirectory()
    && fs.existsSync(path.join(PLUGINS_DIR, d, 'src', 'index.ts')))

describe('Plugin smoke tests', () => {
  // Test that every plugin has the required files
  it.each(pluginDirs)('%s has required files', (dir) => {
    const p = path.join(PLUGINS_DIR, dir)
    expect(fs.existsSync(path.join(p, 'package.json'))).toBe(true)
    expect(fs.existsSync(path.join(p, 'tsconfig.json'))).toBe(true)
    expect(fs.existsSync(path.join(p, 'src', 'index.ts'))).toBe(true)
    expect(fs.existsSync(path.join(p, 'cordis.patch.yml'))).toBe(true)
  })

  // Test that every package.json has required fields
  it.each(pluginDirs)('%s package.json is valid', (dir) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PLUGINS_DIR, dir, 'package.json'), 'utf-8'))
    expect(pkg.name).toMatch(/^@sandbaseai\/dsh-plugin-/)
    expect(pkg.version).toBe('0.1.0')
    expect(pkg.type).toBe('module')
    expect(pkg.main).toBe('lib/index.js')
    expect(pkg.peerDependencies).toBeDefined()
    expect(pkg.peerDependencies['@deepseek-ai/cordis']).toBeDefined()
    expect(pkg.peerDependencies['@deepseek-ai/dsh-tools']).toBeDefined()
  })

  // Test that every source file exports the required symbols
  it.each(pluginDirs)('%s exports name, inject, Config, apply', (dir) => {
    const src = fs.readFileSync(path.join(PLUGINS_DIR, dir, 'src', 'index.ts'), 'utf-8')
    expect(src).toContain('export const name')
    expect(src).toContain('export const inject')
    expect(src).toContain('export const Config')
    expect(src).toContain('export function apply')
    expect(src).toContain('defineTool')
    if (dir !== 'dsh-store') {
      // Either the shared SandBase helpers (which resolve the key themselves)
      // or an explicit SandBase credential lookup.
      const usesHelper = /\b(runSandbaseModel|sandbaseChat)\b/.test(src)
      if (!usesHelper) {
        expect(src).toContain('resolveCredential')
        expect(src).toContain("'sandbase'")
      }
    }
  })

  // Test that cordis.patch.yml is valid YAML structure
  it.each(pluginDirs)('%s cordis.patch.yml is valid', (dir) => {
    const yml = fs.readFileSync(path.join(PLUGINS_DIR, dir, 'cordis.patch.yml'), 'utf-8')
    expect(yml).toContain('@sandbaseai/dsh-plugin-')
    expect(yml).toContain('enabled: true')
    expect(yml).toContain('- insert:')
    if (dir !== 'dsh-store') expect(yml).toContain('timeoutMs:')
  })
})

describe('Plugin count', () => {
  it('has exactly 102 plugins (excluding shared)', () => {
    expect(pluginDirs.length).toBe(102)
  })
})

describe('Plugin categories', () => {
  const categories: Record<string, string[]> = {
    'web-content': ['web-search', 'web-fetch', 'web-screenshot', 'web-crawl', 'news-search', 'image-search', 'sitemap-parse', 'font-detect', 'brand-detect', 'styleguide-extract'],
    'social-media': ['twitter-search', 'twitter-followers', 'instagram-profile', 'instagram-search', 'instagram-posts', 'tiktok-video', 'tiktok-profile', 'tiktok-comments', 'linkedin-profile', 'linkedin-posts', 'linkedin-company', 'reddit-posts', 'reddit-comments', 'youtube-search', 'youtube-transcript', 'facebook-ads'],
    'business': ['company-search', 'company-enrich', 'company-news', 'company-jobs', 'employee-reviews', 'tech-stack', 'company-id', 'domain-analyzer', 'pep-check', 'industry-search', 'product-reviews', 'us-company-data'],
    'ecommerce': ['amazon-product', 'amazon-reviews', 'google-shopping', 'price-compare', 'product-extract', 'product-extract-bulk', 'transaction-identify'],
    'finance': ['token-price', 'token-price-chart', 'token-price-change', 'protocol-tvl', 'chain-tvl', 'chain-historical-tvl', 'protocol-fees', 'stablecoin-mcap'],
    'maps': ['google-maps-reviews', 'google-maps-places', 'timezone-lookup', 'flight-status', 'weather-lookup'],
    'dev-tools': ['github-profile', 'npm-package', 'tech-stack-detect', 'email-validate', 'phone-normalize', 'password-strength', 'url-to-markdown', 'translate'],
    'multimodal': ['image-gen-flux', 'image-gen-sd', 'image-gen-ideogram', 'image-gen-imagen', 'image-gen-seedream', 'image-gen-dalle', 'image-gen-recraft', 'image-edit', 'bg-remove', 'image-upscale', 'video-gen-kling', 'video-gen-veo', 'video-gen-seedance', 'tts-elevenlabs', '3d-gen-hunyuan', 'avatar-heygen'],
    'predictions': ['polymarket-markets', 'polymarket-positions', 'kalshi-markets', 'limitless-markets', 'predictfun-markets'],
    'mcp': ['mcp-filesystem', 'mcp-postgres', 'mcp-github', 'mcp-slack', 'mcp-notion', 'mcp-airtable', 'mcp-figma', 'mcp-jira', 'mcp-linear', 'mcp-sentry'],
    'utilities': ['structured-extract', 'google-search', 'serp-analyze'],
    'deepseek': ['deepseek-chat'],
  }

  for (const [category, plugins] of Object.entries(categories)) {
    it(`category ${category} has all ${plugins.length} plugins`, () => {
      for (const p of plugins) {
        expect(pluginDirs).toContain(p)
      }
    })
  }
})