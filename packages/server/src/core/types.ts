/**
 * Core types for Optimaiz Server
 * These types are shared between OSS and Cloud
 */

export type Role = 'system' | 'user' | 'assistant' | 'tool';

// Multi-modal metadata types
export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  colorSpace?: string;
  dominantColors?: string[];
  hasText?: boolean;
  ocrText?: string;
  description?: string;
  objects?: string[];
  faces?: number;
}

export interface AudioMetadata {
  duration?: number;
  format?: string;
  size?: number;
  sampleRate?: number;
  bitrate?: number;
  channels?: number;
  transcription?: string;
  language?: string;
  speakerCount?: number;
  description?: string;
}

export interface VideoMetadata {
  duration?: number;
  format?: string;
  size?: number;
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number;
  codec?: string;
  hasAudio?: boolean;
  keyFrames?: string[];
  thumbnail?: string;
  transcription?: string;
  sceneCount?: number;
  description?: string;
}

export interface MessageContent {
  type: 'text' | 'image' | 'audio' | 'video';
  role: Role;
  value: string;
  mimeType?: string;
  extractedText?: string;
  imageMetadata?: ImageMetadata;
  audioMetadata?: AudioMetadata;
  videoMetadata?: VideoMetadata;
}

export interface RetrievalContext {
  sourceType: 'vector-db' | 'api' | 'file' | 'sql' | string;
  source: string;
  docId?: string;
  contentSnippet: string;
  metadata?: Record<string, any>;
  score?: number;
}

// Tool types
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
  provider?: string;
  category?: string;
  tags?: string[];
  version?: string;
  deprecated?: boolean;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: Record<string, any>;
  };
  _convertedFromFunctionCall?: boolean;
}

export interface ToolResult {
  tool_call_id: string;
  role: 'tool';
  content: string;
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

// Token usage
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

// Feedback
export interface Feedback {
  rating?: 'up' | 'down';
  comment?: string;
  submittedAt?: Date;
  labels?: string[];
}

// Error info
export interface ErrorInfo {
  message: string;
  code?: string;
  details?: any;
}

// Interaction (main entity)
export interface Interaction {
  id?: string;
  appId?: string;

  traceId: string;
  agentId?: string;
  flowId?: string;
  threadId?: string;
  sessionId?: string;
  userId?: string;

  provider: string;
  model: string;
  apiEndpoint?: string;

  prompts: MessageContent[];
  promptTemplate?: MessageContent[];
  promptVariables?: Record<string, string>;

  tools?: ToolDefinition[];
  toolsProvider?: string;

  responses?: MessageContent[];
  modelParams?: Record<string, any>;
  usage?: TokenUsage;

  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  toolsExecuted?: ToolExecution[];

  stream?: boolean;
  error?: ErrorInfo;

  rawRequest?: any;
  rawResponse?: any;

  retrievalContext?: RetrievalContext[];
  grounded?: boolean;
  hallucinationRisk?: 'low' | 'medium' | 'high';

  feedback?: Feedback;

  metadata?: Record<string, any>;
  tags?: string[];

  startTime?: Date;
  endTime?: Date;
  latencyMs?: number;
  modelLatencyMs?: number;

  createdAt?: Date;
  updatedAt?: Date;
}

// Parsed LLM response
export interface ParsedResponse {
  responseText: string;
  responseContent?: MessageContent[];
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  usage?: TokenUsage;
}
