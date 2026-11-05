import { describe, expect, it, vi } from 'vitest'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import { defineTool } from '../src/define-tool.ts'

describe('numeric bounds on current DSH', () => {
  const execute = vi.fn(async (args: { count: number }) => String(args.count))
  const tool = defineTool({
    name: 'bounded', description: 'Bounded test',
    parameters: { count: { type: 'number', required: true, minimum: 1, maximum: 10 } },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    execute,
  })
  it.each([1, 5, 10])('accepts %s', async count => {
    await tool.execute({ count }, {} as ToolRunContext)
    expect(execute).toHaveBeenCalledWith({ count }, expect.anything())
  })
  it.each([0, 11])('rejects %s before execution', async count => {
    execute.mockClear()
    await expect(tool.execute({ count }, {} as ToolRunContext)).rejects.toThrow('count must be')
    expect(execute).not.toHaveBeenCalled()
  })
  it('passes invalid argument shapes to DSH validation', async () => {
    execute.mockClear()
    await expect(tool.execute(null, {} as ToolRunContext)).rejects.toThrow()
    expect(execute).not.toHaveBeenCalled()
  })
  it('retains bounds in the model-facing description', () => {
    expect(JSON.stringify(tool.parameters)).toContain('Minimum 1. Maximum 10.')
  })
})
