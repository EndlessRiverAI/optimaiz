/**
 * @optimaiz/server/core
 *
 * Core utilities for LLM observability
 * Parsers, cost estimation, token extraction, and types
 *
 * This module can be imported by both OSS server and Cloud
 */

// Types
export * from './types';

// Cost estimation
export { estimateCost, hasPricing, getPricing, type EstimateCostParams } from './cost';

// Pricing data
export {
  modelPricing,
  getAvailableModels,
  getSupportedProviders,
  addModelPricing,
  type ModelPricing,
} from './pricing';

// Token extraction
export {
  extractTokens,
  extractOpenAITokens,
  extractAnthropicTokens,
  extractGeminiTokens,
  extractMistralTokens,
  extractPerplexityTokens,
  extractCohereTokens,
  extractTokensUniversal,
  type TokenUsage,
} from './tokens';

// Response parsing
export { parseResponse } from './parsers';

// Tool utilities
export {
  validateToolDefinition,
  validateToolDefinitions,
  validateToolCall,
  validateToolResult,
  toProviderFormat,
  fromProviderFormat,
  toOpenAIFormat,
  toAnthropicFormat,
  toMistralFormat,
  fromOpenAIFormat,
  fromAnthropicFormat,
  fromMistralFormat,
  extractToolCalls,
  hasToolCalls,
  type OpenAITool,
  type AnthropicTool,
  type MistralTool,
} from './tools';
