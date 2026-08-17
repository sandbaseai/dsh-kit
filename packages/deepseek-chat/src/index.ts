/**
 * DSH Cordis plugin: DeepSeek Chat
 *
 * Call DeepSeek models (V4 Pro, R1, V3.2) for chat, reasoning, and code generation.
 * Three tools: deepseek_chat (general), deepseek_reason (deep thinking), deepseek_code (code).
 * @module @sandbaseai/dsh-plugin-deepseek-chat
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { createFetchClient, resolveCredential, handleUpstreamError } from '@sandbaseai/dsh-plugin-shared'

export const name = 'dsh_plugin_deepseek_chat'
export const inject = ['tools', 'web', 'systemPrompt'] as const

export interface Config {
  enabled?: boolean
  timeoutMs?: number
  defaultModel?: string
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  timeoutMs: z.number().default(120000),
  defaultModel: z.string().default('deepseek-v4-pro'),
})

export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  void (async () => {
    const apiKey = await resolveCredential(ctx, 'sandbase', 'api_key')
    const client = createFetchClient({
      baseUrl: 'https://api.sandbase.ai',
      timeoutMs: config.timeoutMs ?? 120000,
      defaultHeaders: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    // ── deepseek_chat ──
    ctx.tools.register(defineTool({
      name: 'deepseek_chat',
      description: 'Call DeepSeek models for general chat, analysis, writing, and Q&A. Best for summarization, translation, content creation, and general knowledge tasks. Use deepseek_reason for complex reasoning and deepseek_code for programming.',
      parameters: {
        prompt: { type: 'string', required: true, description: 'Your prompt or question for DeepSeek.' },
        systemPrompt: { type: 'string', description: 'Optional system prompt to set context/role.' },
        model: { type: 'string', description: 'Model to use (default: deepseek-v4-pro).', enum: ['deepseek-v4-pro', 'deepseek-v3.2', 'deepseek-chat-v3.1', 'deepseek-chat'] },
        maxTokens: { type: 'number', description: 'Max output tokens (default 4096).', minimum: 1, maximum: 32768 },
        temperature: { type: 'number', description: 'Temperature 0-2 (default 0.7).', minimum: 0, maximum: 2 },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        try {
          const model = args.model || config.defaultModel || 'deepseek-v4-pro'
          const body = {
            model: `deepseek/${model}`,
            messages: [
              ...(args.systemPrompt ? [{ role: 'system', content: args.systemPrompt }] : []),
              { role: 'user', content: args.prompt },
            ],
            max_tokens: args.maxTokens || 4096,
            temperature: args.temperature ?? 0.7,
          }
          const data = await client.post<{ content?: string; choices?: Array<{ message?: { content?: string } }> }>('/v1/run', body, exec.signal)
          const text = data?.choices?.[0]?.message?.content || data?.content || JSON.stringify(data)
          return text
        } catch (err) {
          handleUpstreamError(err, 'deepseek_chat')
          throw new Error('unreachable')
        }
      },
    }))

    // ── deepseek_reason ──
    ctx.tools.register(defineTool({
      name: 'deepseek_reason',
      description: 'Call DeepSeek R1 for deep reasoning on complex problems. Best for math, logic, scientific analysis, multi-step planning, and problems requiring step-by-step thinking. Returns the reasoning chain and final answer.',
      parameters: {
        prompt: { type: 'string', required: true, description: 'The complex problem or question to reason about.' },
        maxTokens: { type: 'number', description: 'Max output tokens (default 8192).', minimum: 1, maximum: 32768 },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        try {
          const body = {
            model: 'deepseek/deepseek-r1',
            messages: [{ role: 'user', content: args.prompt }],
            max_tokens: args.maxTokens || 8192,
          }
          const data = await client.post<{ content?: string; choices?: Array<{ message?: { content?: string } }> }>('/v1/run', body, exec.signal)
          const text = data?.choices?.[0]?.message?.content || data?.content || JSON.stringify(data)
          return text
        } catch (err) {
          handleUpstreamError(err, 'deepseek_reason')
          throw new Error('unreachable')
        }
      },
    }))

    // ── deepseek_code ──
    ctx.tools.register(defineTool({
      name: 'deepseek_code',
      description: 'Call DeepSeek for code generation, review, debugging, refactoring, and technical explanation. Best for writing code, fixing bugs, explaining algorithms, and code review. Use deepseek_reason for complex algorithm design.',
      parameters: {
        prompt: { type: 'string', required: true, description: 'The coding task: write code, fix a bug, review, explain, or refactor.' },
        language: { type: 'string', description: 'Programming language hint (e.g. python, typescript, go, rust).' },
        model: { type: 'string', description: 'Model (default: deepseek-v4-pro).', enum: ['deepseek-v4-pro', 'deepseek-v3.2', 'deepseek-chat-v3.1'] },
        maxTokens: { type: 'number', description: 'Max output tokens (default 8192).', minimum: 1, maximum: 32768 },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        try {
          const model = args.model || 'deepseek-v4-pro'
          const systemPrompt = `You are an expert programmer${args.language ? ` specializing in ${args.language}` : ''}. Write clean, well-documented, production-quality code. Include explanations for complex logic.`
          const body = {
            model: `deepseek/${model}`,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: args.prompt },
            ],
            max_tokens: args.maxTokens || 8192,
            temperature: 0.3,
          }
          const data = await client.post<{ content?: string; choices?: Array<{ message?: { content?: string } }> }>('/v1/run', body, exec.signal)
          const text = data?.choices?.[0]?.message?.content || data?.content || JSON.stringify(data)
          return text
        } catch (err) {
          handleUpstreamError(err, 'deepseek_code')
          throw new Error('unreachable')
        }
      },
    }))
  })()
}