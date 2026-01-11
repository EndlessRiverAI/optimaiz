/**
 * Tool conversion utilities for multi-provider support
 */

import type {
  ToolDefinition,
  OpenAITool,
  AnthropicTool,
  MistralTool,
} from './types';

/**
 * Validate tool definitions
 */
export function validateTools(tools: ToolDefinition[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(tools)) {
    errors.push('Tools must be an array');
    return { valid: false, errors };
  }

  for (const tool of tools) {
    if (!tool.name || typeof tool.name !== 'string') {
      errors.push(`Tool must have a valid name: ${tool.name}`);
    }

    if (!tool.description || typeof tool.description !== 'string') {
      errors.push(`Tool ${tool.name} must have a valid description`);
    }

    if (!tool.parameters || typeof tool.parameters !== 'object') {
      errors.push(`Tool ${tool.name} must have valid parameters`);
    } else {
      if (tool.parameters.type !== 'object') {
        errors.push(`Tool ${tool.name} parameters must have type 'object'`);
      }

      if (!tool.parameters.properties || typeof tool.parameters.properties !== 'object') {
        errors.push(`Tool ${tool.name} must have properties defined`);
      }
    }
  }

  // Check for duplicates
  const names = tools.map(t => t.name);
  const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
  if (duplicates.length > 0) {
    errors.push(`Duplicate tool names found: ${duplicates.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Convert unified tool definitions to OpenAI format
 */
export function toOpenAIFormat(tools: ToolDefinition[]): OpenAITool[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Convert unified tool definitions to Anthropic format
 */
export function toAnthropicFormat(tools: ToolDefinition[]): AnthropicTool[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: tool.parameters.properties,
      required: tool.parameters.required,
    },
  }));
}

/**
 * Convert unified tool definitions to Mistral format
 */
export function toMistralFormat(tools: ToolDefinition[]): MistralTool[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Convert tools to provider-specific format
 */
export function toProviderFormat(tools: ToolDefinition[], provider: string): any[] {
  const lowerProvider = provider.toLowerCase();

  if (lowerProvider.includes('openai') || lowerProvider.includes('gpt')) {
    return toOpenAIFormat(tools);
  }

  if (lowerProvider.includes('anthropic') || lowerProvider.includes('claude')) {
    return toAnthropicFormat(tools);
  }

  if (lowerProvider.includes('mistral')) {
    return toMistralFormat(tools);
  }

  // Default to OpenAI format (most common)
  return toOpenAIFormat(tools);
}

/**
 * Convert OpenAI format tools to unified format
 */
export function fromOpenAIFormat(tools: OpenAITool[]): ToolDefinition[] {
  return tools.map(tool => ({
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters as ToolDefinition['parameters'],
  }));
}

/**
 * Convert Anthropic format tools to unified format
 */
export function fromAnthropicFormat(tools: AnthropicTool[]): ToolDefinition[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: tool.input_schema.properties,
      required: tool.input_schema.required,
    },
  }));
}

/**
 * Convert Mistral format tools to unified format
 */
export function fromMistralFormat(tools: MistralTool[]): ToolDefinition[] {
  return tools.map(tool => ({
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters as ToolDefinition['parameters'],
  }));
}

/**
 * Convert provider-specific tools to unified format
 */
export function fromProviderFormat(tools: any[], provider: string): ToolDefinition[] {
  const lowerProvider = provider.toLowerCase();

  if (lowerProvider.includes('openai') || lowerProvider.includes('gpt')) {
    return fromOpenAIFormat(tools);
  }

  if (lowerProvider.includes('anthropic') || lowerProvider.includes('claude')) {
    return fromAnthropicFormat(tools);
  }

  if (lowerProvider.includes('mistral')) {
    return fromMistralFormat(tools);
  }

  // Fallback - try to auto-detect format
  if (tools.length > 0) {
    const first = tools[0];
    if (first.function) {
      return fromOpenAIFormat(tools);
    }
    if (first.input_schema) {
      return fromAnthropicFormat(tools);
    }
  }

  // Assume already in unified format
  return tools;
}
