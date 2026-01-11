/**
 * Core types for Optimaiz SDK
 */

export type Role = 'system' | 'user' | 'assistant' | 'tool';

// Message content types (multi-modal support)
export interface MessageContent {
  type: 'text' | 'image' | 'audio' | 'video';
  role: Role;
  value: string;
  mimeType?: string;
  extractedText?: string;
}

// Feedback types
export interface Feedback {
  rating?: 'up' | 'down';
  comment?: string;
  labels?: string[];
  submittedAt?: Date;
}

// Tool definition types
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  enum?: string[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
  category?: string;
  tags?: string[];
  version?: string;
  deprecated?: boolean;
}

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

// Tool execution types
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: Record<string, any>;
  };
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: any;
  error?: string;
}

export interface ToolExecution {
  toolId: string;
  toolName: string;
  executionTime: Date;
  duration?: number;
  success: boolean;
  error?: string;
  result?: any;
}

// Token usage types
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

// Interaction types
export interface Interaction {
  traceId: string;
  agentId?: string;
  flowId?: string;
  threadId?: string;
  sessionId?: string;
  userId?: string;

  provider: string;
  model: string;

  prompts: MessageContent[];
  promptTemplate?: MessageContent[];
  promptVariables?: Record<string, string>;

  tools?: ToolDefinition[];
  responses?: MessageContent[];

  modelParams?: Record<string, any>;
  usage?: TokenUsage;

  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  toolsExecuted?: ToolExecution[];

  error?: {
    message: string;
    code?: string;
    details?: any;
  };

  feedback?: Feedback;

  metadata?: Record<string, any>;
  tags?: string[];

  startTime?: Date;
  endTime?: Date;
  latencyMs?: number;

  createdAt?: Date;
  updatedAt?: Date;
}

// SDK Configuration
export interface OptimaixConfig {
  token: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

// API Response types
export interface StartTraceRequest {
  traceId?: string;
  agentId?: string;
  flowId?: string;
  threadId?: string;
  sessionId?: string;
  userId?: string;
  promptTemplate?: MessageContent[];
  promptVariables?: Record<string, string>;
  tools?: ToolDefinition[];
  provider: string;
  model: string;
  modelParams?: Record<string, any>;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface AppendResponseRequest {
  traceId: string;
  rawResponse?: any;
  provider?: string;
  model?: string;
  threadId?: string;
  userId?: string;
  agentId?: string;
  flowId?: string;
  sessionId?: string;
}

export interface TraceResponse {
  success: boolean;
  traceId: string;
  interaction?: Interaction;
  error?: string;
}
