/**
 * @optimaiz/sdk
 *
 * Open-source SDK for LLM observability
 * Track costs, latency, and usage across OpenAI, Anthropic, Gemini, and more
 *
 * @example
 * ```typescript
 * import { OptimaizClient } from '@optimaiz/sdk';
 *
 * const client = new OptimaizClient({
 *   token: 'your-api-token',
 *   baseUrl: 'http://localhost:3456', // OSS server
 * });
 *
 * // Wrap your LLM call for automatic tracing
 * const { response, traceId } = await client.wrapLLMCall({
 *   provider: 'openai',
 *   model: 'gpt-4',
 *   promptTemplate: [{ type: 'text', role: 'user', value: 'Hello {name}!' }],
 *   promptVariables: { name: 'World' },
 *   call: () => openai.chat.completions.create({ ... }),
 * });
 * ```
 */

// Main client
export { OptimaizClient } from './client';

// Types
export type {
  // Core types
  Role,
  MessageContent,
  Feedback,
  TokenUsage,
  Interaction,

  // Tool types
  ToolParameter,
  ToolDefinition,
  ToolCall,
  ToolResult,
  ToolExecution,

  // Provider-specific tool formats
  OpenAITool,
  AnthropicTool,
  MistralTool,

  // Config & API types
  OptimaixConfig,
  StartTraceRequest,
  AppendResponseRequest,
  TraceResponse,
} from './types';

// Errors
export {
  OptimaizError,
  OptimaizAuthenticationError,
  OptimaizValidationError,
  OptimaizServerError,
  OptimaizNetworkError,
  isOptimaizError,
  isAuthenticationError,
  isValidationError,
  isServerError,
  isNetworkError,
} from './errors';

// Tool utilities
export {
  validateTools,
  toProviderFormat,
  fromProviderFormat,
  toOpenAIFormat,
  toAnthropicFormat,
  toMistralFormat,
  fromOpenAIFormat,
  fromAnthropicFormat,
  fromMistralFormat,
} from './tools';

// Default export
export { OptimaizClient as default } from './client';
