/**
 * Schema utilities for converting sandbase-registry model schemas
 * to DSH defineTool parameters.
 */

import type z from '@deepseek-ai/schemastery'

/** Simplified OpenAPI-like schema from sandbase-registry model.json. */
export interface RegistryModelSchema {
  type?: string
  required?: string[]
  properties?: Record<string, RegistryProperty>
  items?: RegistryModelSchema
  enum?: string[]
  description?: string
  default?: unknown
  minimum?: number
  maximum?: number
  maxLength?: number
  minLength?: number
}

interface RegistryProperty {
  type?: string
  description?: string
  enum?: string[]
  default?: unknown
  minimum?: number
  maximum?: number
  maxLength?: number
  minLength?: number
  items?: { type?: string }
  properties?: Record<string, RegistryProperty>
  required?: string[]
  additionalProperties?: boolean
}

/** Convert a sandbase-registry schema to tool parameters format. */
export function schemaFromRegistry(schema: RegistryModelSchema): Record<string, ToolParamDef> {
  if (!schema.properties) return {}

  const params: Record<string, ToolParamDef> = {}
  const required = new Set(schema.required ?? [])

  for (const [key, prop] of Object.entries(schema.properties)) {
    params[key] = {
      type: mapType(prop.type ?? 'string'),
      required: required.has(key),
      description: prop.description ?? '',
      ...(prop.default !== undefined && { default: prop.default }),
      ...(prop.enum && { enum: prop.enum }),
      ...(prop.minimum !== undefined && { minimum: prop.minimum }),
      ...(prop.maximum !== undefined && { maximum: prop.maximum }),
      ...(prop.minLength !== undefined && { minLength: prop.minLength }),
      ...(prop.maxLength !== undefined && { maxLength: prop.maxLength }),
    }
  }

  return params
}

interface ToolParamDef {
  type: string
  required: boolean
  description: string
  default?: unknown
  enum?: string[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
}

function mapType(type: string): string {
  switch (type) {
    case 'integer': return 'number'
    case 'boolean': return 'boolean'
    case 'array': return 'array'
    case 'object': return 'object'
    default: return 'string'
  }
}

/** Build tool parameters from a simple key-value spec. */
export function buildToolParams(
  fields: Record<string, {
    type: string
    required?: boolean
    description: string
    default?: unknown
    enum?: string[]
    minimum?: number
    maximum?: number
  }>,
): Record<string, ToolParamDef> {
  const params: Record<string, ToolParamDef> = {}
  for (const [key, field] of Object.entries(fields)) {
    params[key] = {
      type: field.type,
      required: field.required ?? false,
      description: field.description,
      ...(field.default !== undefined && { default: field.default }),
      ...(field.enum && { enum: field.enum }),
      ...(field.minimum !== undefined && { minimum: field.minimum }),
      ...(field.maximum !== undefined && { maximum: field.maximum }),
    }
  }
  return params
}