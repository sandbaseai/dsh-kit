/**
 * DSH Cordis plugin: DeepSeek Chat
 *
 * Call DeepSeek models (V4 Pro, V3.2) through SandBase for chat, reasoning, and code generation.
 * Three tools: deepseek_chat (general), deepseek_reason (deep thinking), deepseek_code (code).
 * @module @sandbaseai/dsh-plugin-deepseek-chat
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, sandbaseChat } from '@sandbaseai/dsh-plugin-shared'

export const name = 'dsh_plugin_deepseek_chat'
export const inject = ['tools', 'web', 'systemPrompt'] as const

export interface Config {
  /** Prefix used to avoid collisions with host tools. */
  toolPrefix?: string
  enabled?: boolean
  timeoutMs?: number
  defaultModel?: string
}

export const Config: z<Config> = z.object({
  toolPrefix: z.string().default(''),
  enabled: z.boolean().default(true),
  timeoutMs: z.number().default(120000),
  defaultModel: z.string().default('deepseek-v4-pro'),
})

export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return

  return (async () => {
    // ── deepseek_chat ──
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'deepseek_chat',
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
        const model = args.model || config.defaultModel || 'deepseek-v4-pro'
        const result = await sandbaseChat(ctx, {
          toolName: 'deepseek_chat',
          model: `deepseek/${model}`,
          messages: [
            ...(args.systemPrompt ? [{ role: 'system' as const, content: args.systemPrompt }] : []),
            { role: 'user', content: args.prompt },
          ],
          maxTokens: args.maxTokens || 4096,
          temperature: args.temperature ?? 0.7,
          timeoutMs: config.timeoutMs ?? 120000,
          signal: exec.signal,
        })
        return result.content || JSON.stringify(result)
      },
    }))

    // ── deepseek_reason ──
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'deepseek_reason',
      description: 'Call DeepSeek V4 Pro for deep reasoning on complex problems. Best for math, logic, scientific analysis, multi-step planning, and problems requiring step-by-step thinking. Returns the reasoning chain and final answer.',
      parameters: {
        prompt: { type: 'string', required: true, description: 'The complex problem or question to reason about.' },
        maxTokens: { type: 'number', description: 'Max output tokens (default 8192).', minimum: 1, maximum: 32768 },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        // deepseek-r1 is not on SandBase; V4 Pro is DeepSeek's reasoning model there.
        const result = await sandbaseChat(ctx, {
          toolName: 'deepseek_reason',
          model: 'deepseek/deepseek-v4-pro',
          messages: [{ role: 'user', content: args.prompt }],
          maxTokens: args.maxTokens || 8192,
          timeoutMs: config.timeoutMs ?? 120000,
          signal: exec.signal,
        })
        if (result.reasoning) return `Reasoning:\n${result.reasoning}\n\nAnswer:\n${result.content}`
        return result.content || JSON.stringify(result)
      },
    }))

    // ── deepseek_code ──
    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'deepseek_code',
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
        const model = args.model || 'deepseek-v4-pro'
        const systemPrompt = `You are an expert programmer${args.language ? ` specializing in ${args.language}` : ''}. Write clean, well-documented, production-quality code. Include explanations for complex logic.`
        const result = await sandbaseChat(ctx, {
          toolName: 'deepseek_code',
          model: `deepseek/${model}`,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: args.prompt },
          ],
          maxTokens: args.maxTokens || 8192,
          temperature: 0.3,
          timeoutMs: config.timeoutMs ?? 120000,
          signal: exec.signal,
        })
        return result.content || JSON.stringify(result)
      },
    }))
  })()
}