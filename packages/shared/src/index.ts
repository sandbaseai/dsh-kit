/**
 * Shared utilities for DSH plugins.
 * @module @sandbaseai/dsh-plugin-shared
 */

export { createFetchClient, type FetchClient, type FetchClientOptions } from './fetch-client.ts'
export { resolveCredential, type CredentialRef } from './credential-resolver.ts'
export { PluginError, handleUpstreamError, type PluginErrorCode } from './error-handler.ts'
export { buildToolParams, schemaFromRegistry, type RegistryModelSchema } from './schema-utils.ts'
export { createPlugin, type PluginDefinition, type PluginConfig } from './plugin-skeleton.ts'
export { defineTool } from './define-tool.ts'
export {
  runSandbaseModel,
  sandbaseChat,
  SANDBASE_BASE_URL,
  type SandbaseRunResult,
  type SandbaseRunOutput,
  type RunSandbaseModelOptions,
  type SandbaseChatMessage,
  type SandbaseChatOptions,
  type SandbaseChatResult,
} from './sandbase-run.ts'
