/**
 * Optimaiz SDK Client
 *
 * Main client for interacting with Optimaiz server (OSS or Cloud)
 */

import type {
  OptimaixConfig,
  MessageContent,
  ToolDefinition,
  ToolResult,
  Feedback,
  StartTraceRequest,
  AppendResponseRequest,
  TraceResponse,
  Role,
} from './types';

import {
  OptimaizError,
  OptimaizAuthenticationError,
  OptimaizValidationError,
  OptimaizServerError,
  OptimaizNetworkError,
} from './errors';

import { validateTools, toProviderFormat, fromProviderFormat } from './tools';

const DEFAULT_BASE_URL = 'http://localhost:3456';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 0;

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class OptimaizClient {
  private baseUrl: string;
  private token: string;
  private timeout: number;
  private retries: number;
  private debug: boolean;

  constructor(config: OptimaixConfig) {
    if (!config.token || typeof config.token !== 'string') {
      throw new OptimaizValidationError('OptimaizClient requires a valid token');
    }

    this.token = config.token;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.retries = config.retries || DEFAULT_RETRIES;
    this.debug = config.debug || false;
  }

  private log(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[Optimaiz] ${message}`, data || '');
    }
  }

  private async request<T>(path: string, body: any, retriesLeft = this.retries): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    this.log(`POST ${path}`, { bodyKeys: Object.keys(body) });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage: string;
        let errorDetails: string | undefined;

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `HTTP ${response.status}`;
          errorDetails = errorData.details;
        } catch {
          errorMessage = `HTTP ${response.status}`;
        }

        if (response.status === 401) {
          throw new OptimaizAuthenticationError(errorMessage, errorDetails);
        } else if (response.status === 400) {
          throw new OptimaizValidationError(errorMessage, errorDetails);
        } else if (response.status >= 500) {
          throw new OptimaizServerError(errorMessage, errorDetails);
        } else {
          throw new OptimaizError(errorMessage, response.status, errorDetails);
        }
      }

      return response.json() as Promise<T>;
    } catch (error: any) {
      // Handle network errors
      if (error.name === 'AbortError') {
        throw new OptimaizNetworkError(`Request timeout after ${this.timeout}ms`);
      }

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        if (retriesLeft > 0) {
          this.log(`Retrying request (${retriesLeft} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.request(path, body, retriesLeft - 1);
        }
        throw new OptimaizNetworkError(`Unable to connect to ${this.baseUrl}`);
      }

      throw error;
    }
  }

  /**
   * Start a new trace
   */
  async startTrace(data: StartTraceRequest): Promise<TraceResponse> {
    if (!data.promptTemplate && !data.promptVariables) {
      throw new OptimaizValidationError(
        'Either promptTemplate or promptVariables must be provided'
      );
    }

    if (data.tools) {
      const validation = validateTools(data.tools);
      if (!validation.valid) {
        throw new OptimaizValidationError(
          `Invalid tool definitions: ${validation.errors.join(', ')}`
        );
      }
    }

    const traceId = data.traceId || generateId();

    // Fire network request in the background
    this.request<TraceResponse>('/api/v1/interactions/start', {
      ...data,
      traceId,
    }).catch(err => this.log('Failed to start trace in background', err));

    // Return traceId immediately
    return { success: true, traceId };
  }

  /**
   * Append LLM response to a trace
   */
  async appendResponse(data: AppendResponseRequest): Promise<TraceResponse> {
    if (!data.traceId) {
      throw new OptimaizValidationError('traceId is required');
    }

    // Fire network request in background
    this.request<TraceResponse>('/api/v1/interactions/append', data)
      .catch(err => this.log('Failed to append response in background', err));

    return { success: true, traceId: data.traceId };
  }

  /**
   * Finalize a trace (calculate latency, etc.)
   */
  async finalizeTrace(traceId: string): Promise<TraceResponse> {
    if (!traceId) {
      throw new OptimaizValidationError('traceId is required');
    }

    // Fire network request in background
    this.request<TraceResponse>('/api/v1/interactions/finalize', { traceId })
      .catch(err => this.log('Failed to finalize trace in background', err));

    return { success: true, traceId };
  }

  /**
   * Log an error to a trace
   */
  async logError(
    traceId: string,
    error: { message: string; code?: string; details?: any }
  ): Promise<TraceResponse> {
    if (!traceId) {
      throw new OptimaizValidationError('traceId is required');
    }

    // Fire network request in background
    this.request<TraceResponse>('/api/v1/interactions/error', { traceId, error })
      .catch(err => this.log('Failed to log error in background', err));

    return { success: true, traceId };
  }

  /**
   * Send feedback for a trace
   */
  async sendFeedback(traceId: string, feedback: Feedback): Promise<TraceResponse> {
    if (!traceId) {
      throw new OptimaizValidationError('traceId is required');
    }

    // Fire network request in background
    this.request<TraceResponse>('/api/v1/interactions/feedback', {
      traceId,
      feedback,
    }).catch(err => this.log('Failed to send feedback in background', err));

    return { success: true, traceId };
  }

  /**
   * Add tool execution record
   */
  async addToolExecution(data: {
    traceId: string;
    toolId: string;
    toolName: string;
    executionTime?: Date;
    duration?: number;
    success: boolean;
    error?: string;
    result?: any;
  }): Promise<TraceResponse> {
    if (!data.traceId) {
      throw new OptimaizValidationError('traceId is required');
    }

    // Fire network request in background
    this.request<TraceResponse>('/api/v1/interactions/tool-execution', {
      ...data,
      executionTime: data.executionTime || new Date(),
    }).catch(err => this.log('Failed to add tool execution in background', err));

    return { success: true, traceId: data.traceId };
  }

  /**
   * Add tool results to a trace
   */
  async addToolResults(data: {
    traceId: string;
    toolResults: ToolResult[];
  }): Promise<TraceResponse> {
    if (!data.traceId) {
      throw new OptimaizValidationError('traceId is required');
    }

    if (!Array.isArray(data.toolResults) || data.toolResults.length === 0) {
      throw new OptimaizValidationError('toolResults must be a non-empty array');
    }

    // Fire network request in background
    this.request<TraceResponse>('/api/v1/interactions/tool-results', data)
      .catch(err => this.log('Failed to add tool results in background', err));

    return { success: true, traceId: data.traceId };
  }

  /**
   * Compose prompts from templates and variables
   */
  composePrompts(
    templates: Array<{ role: Role; content: string; type?: MessageContent['type'] }>,
    variables: Record<string, string>
  ): {
    prompts: MessageContent[];
    promptTemplate: MessageContent[];
    promptVariables: Record<string, string>;
  } {
    if (!Array.isArray(templates)) {
      throw new OptimaizValidationError('Templates must be an array');
    }

    const prompts: MessageContent[] = [];
    const promptTemplate: MessageContent[] = [];

    for (const { role, content, type = 'text' } of templates) {
      // Resolve variables in content
      const resolved = Object.entries(variables).reduce(
        (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value || '')),
        content
      );

      prompts.push({ type, role, value: resolved });
      promptTemplate.push({ type, role, value: content });
    }

    return { prompts, promptTemplate, promptVariables: variables };
  }

  /**
   * High-level wrapper for LLM calls with automatic tracing
   */
  async wrapLLMCall<T>({
    traceId = generateId(),
    agentId,
    flowId,
    threadId,
    sessionId,
    userId,
    promptTemplate,
    promptVariables,
    tools,
    provider,
    model,
    modelParams,
    metadata,
    tags,
    call,
  }: {
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
    call: () => Promise<T>;
  }): Promise<{ response: T; traceId: string }> {
    // Start trace (non-blocking)
    this.startTrace({
      traceId,
      agentId,
      flowId,
      threadId,
      sessionId,
      userId,
      promptTemplate,
      promptVariables,
      tools,
      provider,
      model,
      modelParams,
      metadata,
      tags,
    }).catch(err => this.log('Failed to start trace', err));

    try {
      // Execute the LLM call
      const response = await call();

      // Append response (non-blocking)
      this.appendResponse({ traceId, rawResponse: response, provider, model })
        .catch(err => this.log('Failed to append response', err));

      // Finalize trace (non-blocking)
      this.finalizeTrace(traceId)
        .catch(err => this.log('Failed to finalize trace', err));

      return { response, traceId };
    } catch (err: any) {
      // Log error (non-blocking)
      this.logError(traceId, {
        message: err.message,
        code: err.code || 'unknown_error',
        details: err.stack,
      }).catch(logErr => this.log('Failed to log error', logErr));

      throw err;
    }
  }

  /**
   * Convert tools to provider-specific format
   */
  convertToolsToProvider(tools: ToolDefinition[], provider: string): any[] {
    return toProviderFormat(tools, provider);
  }

  /**
   * Convert provider-specific tools to unified format
   */
  convertToolsFromProvider(tools: any[], provider: string): ToolDefinition[] {
    return fromProviderFormat(tools, provider);
  }

  /**
   * Validate tool definitions
   */
  validateTools(tools: ToolDefinition[]): { valid: boolean; errors: string[] } {
    return validateTools(tools);
  }
}
