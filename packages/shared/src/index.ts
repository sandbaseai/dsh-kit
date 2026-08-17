/**
 * Shared utilities for DSH plugins.
 * @module @sandbaseai/dsh-plugin-shared
 */

export { createFetchClient, type FetchClient, type FetchClientOptions } from './fetch-client.ts'
export { resolveCredential, type CredentialRef } from './credential-resolver.ts'
export { PluginError, handleUpstreamError, type PluginErrorCode } from './error-handler.ts'
export { buildToolParams, schemaFromRegistry, type RegistryModelSchema } from './schema-utils.ts'
export { createPlugin, type PluginDefinition, type PluginConfig } from './plugin-skeleton.ts'