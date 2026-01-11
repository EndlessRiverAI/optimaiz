/**
 * Tool Conversion Utilities
 *
 * Convert tool definitions between different LLM provider formats
 */

import type { ToolDefinition, ToolCall, ToolResult } from './types';

// Provider-specific tool formats
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MistralTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Validate tool definition
 */
export function validateToolDefinition(tool: ToolDefinition): boolean {
  return !!(
    tool.name &&
    tool.description &&
    tool.parameters?.type === 'object' &&
    tool.parameters?.properties
  );
}

/**
 * Validate array of tool definitions
 */
export function validateToolDefinitions(
  tools: ToolDefinition[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(tools)) {
    errors.push('Tools must be an array');
    return { valid: false, errors };
  }

  if (tools.length === 0) {
    errors.push('Tools array cannot be empty');
    return { valid: false, errors };
  }

  // Check for duplicates
  const names = tools.map((t) => t.name);
  const uniqueNames = new Set(names);
  if (uniqueNames.size !== names.length) {
    errors.push('Duplicate tool names found');
  }

  // Validate each tool
  tools.forEach((tool, index) => {
    if (!validateToolDefinition(tool)) {
      errors.push(`Tool at index ${index} is invalid`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Convert to OpenAI format
 */
export function toOpenAIFormat(tools: ToolDefinition[]): OpenAITool[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Convert to Anthropic format
 */
export function toAnthropicFormat(tools: ToolDefinition[]): AnthropicTool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

/**
 * Convert to Mistral format
 */
export function toMistralFormat(tools: ToolDefinition[]): MistralTool[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Convert to provider-specific format
 */
export function toProviderFormat(tools: ToolDefinition[], provider: string): any[] {
  const lowerProvider = provider.toLowerCase();

  if (lowerProvider.includes('openai')) {
    return toOpenAIFormat(tools);
  }

  if (lowerProvider.includes('anthropic')) {
    return toAnthropicFormat(tools);
  }

  if (lowerProvider.includes('mistral')) {
    return toMistralFormat(tools);
  }

  // Default to OpenAI format
  return toOpenAIFormat(tools);
}

/**
 * Convert from OpenAI format to unified
 */
export function fromOpenAIFormat(tools: OpenAITool[]): ToolDefinition[] {
  return tools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters as ToolDefinition['parameters'],
    provider: 'openai',
  }));
}

/**
 * Convert from Anthropic format to unified
 */
export function fromAnthropicFormat(tools: AnthropicTool[]): ToolDefinition[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema as ToolDefinition['parameters'],
    provider: 'anthropic',
  }));
}

/**
 * Convert from Mistral format to unified
 */
export function fromMistralFormat(tools: MistralTool[]): ToolDefinition[] {
  return tools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters as ToolDefinition['parameters'],
    provider: 'mistral',
  }));
}

/**
 * Convert from provider-specific format to unified
 */
export function fromProviderFormat(tools: any[], provider: string): ToolDefinition[] {
  const lowerProvider = provider.toLowerCase();

  if (lowerProvider.includes('openai')) {
    return fromOpenAIFormat(tools);
  }

  if (lowerProvider.includes('anthropic')) {
    return fromAnthropicFormat(tools);
  }

  if (lowerProvider.includes('mistral')) {
    return fromMistralFormat(tools);
  }

  // Fallback - auto-detect
  if (tools.length > 0) {
    const first = tools[0];
    if (first.function) {
      return fromOpenAIFormat(tools);
    }
    if (first.input_schema) {
      return fromAnthropicFormat(tools);
    }
  }

  return tools;
}

/**
 * Validate tool call
 */
export function validateToolCall(toolCall: ToolCall): boolean {
  return !!(
    toolCall.id &&
    toolCall.type === 'function' &&
    toolCall.function?.name &&
    toolCall.function?.arguments !== undefined
  );
}

/**
 * Validate tool result
 */
export function validateToolResult(result: ToolResult): boolean {
  return !!(result.tool_call_id && result.role === 'tool' && result.content !== undefined);
}

/**
 * Extract tool calls from raw LLM response
 */
export function extractToolCalls(rawResponse: any): ToolCall[] {
  // OpenAI format
  if (rawResponse?.choices?.[0]?.message?.tool_calls) {
    return rawResponse.choices[0].message.tool_calls.map((tc: any) => ({
      id: tc.id,
      type: tc.type,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));
  }

  // OpenAI legacy function calls
  if (rawResponse?.choices?.[0]?.message?.function_call) {
    const fc = rawResponse.choices[0].message.function_call;
    return [
      {
        id: `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'function',
        function: {
          name: fc.name,
          arguments: fc.arguments,
        },
        _convertedFromFunctionCall: true,
      },
    ];
  }

  // Anthropic format
  if (rawResponse?.content) {
    const toolUses = rawResponse.content.filter((item: any) => item.type === 'tool_use');
    return toolUses.map((tu: any) => ({
      id: tu.id,
      type: 'function' as const,
      function: {
        name: tu.name,
        arguments: tu.input,
      },
    }));
  }

  return [];
}

/**
 * Check if response contains tool calls
 */
export function hasToolCalls(rawResponse: any): boolean {
  return extractToolCalls(rawResponse).length > 0;
}
