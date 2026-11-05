import {
  defineTool as defineDshTool,
  ToolArgsError,
  type DefineToolOptions,
  type ParameterSchemaSpec,
  type ValueSchemaSpec,
} from '@deepseek-ai/dsh-tools'

/** Preserve numeric bounds while adapting to DSH's supported schema vocabulary. */
export function defineTool<S extends ParameterSchemaSpec, O extends ValueSchemaSpec>(options: DefineToolOptions<S, O>) {
  const bounds = new Map<string, { minimum?: number; maximum?: number }>()
  const parameters = Object.fromEntries(Object.entries(options.parameters).map(([name, original]) => {
    const { minimum, maximum, ...schema } = original as typeof original & { minimum?: number; maximum?: number }
    const notes: string[] = []
    if (minimum !== undefined) notes.push(`Minimum ${minimum}.`)
    if (maximum !== undefined) notes.push(`Maximum ${maximum}.`)
    if (notes.length > 0) {
      bounds.set(name, { minimum, maximum })
      schema.description = [schema.description, ...notes].filter(Boolean).join(' ')
    }
    return [name, schema]
  })) as S

  const tool = defineDshTool<S, O>({ ...options, parameters })
  const execute = tool.execute
  tool.execute = async (args, exec) => {
    if (args === null || typeof args !== 'object') return execute(args, exec)
    const violations: string[] = []
    for (const [name, limit] of bounds) {
      const value = (args as Record<string, unknown>)[name]
      if (typeof value !== 'number') continue
      if (limit.minimum !== undefined && value < limit.minimum) violations.push(`${name} must be at least ${limit.minimum}`)
      if (limit.maximum !== undefined && value > limit.maximum) violations.push(`${name} must be at most ${limit.maximum}`)
    }
    if (violations.length > 0) throw new ToolArgsError(violations)
    return execute(args, exec)
  }
  return tool
}
