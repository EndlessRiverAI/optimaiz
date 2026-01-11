/**
 * API Routes
 *
 * V1 API endpoints for interaction logging
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createInteraction,
  getInteractionByTraceId,
  updateInteraction,
  listInteractions,
  getAnalyticsSummary,
} from '../db/sqlite';
import { parseResponse, fromProviderFormat } from '../core';
import type { Interaction } from '../core/types';

const router = Router();

// ==================== Middleware ====================

/**
 * Authentication Middleware
 * Checks for Bearer token if OPTIMAIZ_API_KEY environment variable is set
 */
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = process.env.OPTIMAIZ_API_KEY;

  // If no API key is configured, skip authentication (open mode)
  if (!apiKey) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or invalid Authorization header',
    });
  }

  const token = authHeader.split(' ')[1];
  if (token !== apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid API key',
    });
  }

  next();
};

// Apply auth middleware to all routes
router.use(authMiddleware);

// ==================== Validation Schemas ====================

const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any()),
});

const MessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

const StartTraceSchema = z.object({
  traceId: z.string().optional(),
  agentId: z.string().optional(),
  flowId: z.string().optional(),
  threadId: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  promptTemplate: z.array(z.any()).optional(),
  promptVariables: z.record(z.string()).optional(),
  tools: z.array(z.any()).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  modelParams: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Generate unique ID
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Resolve prompt template with variables
 */
function resolvePrompts(
  template: any[],
  variables: Record<string, string>
): any[] {
  if (!template || !variables) return template || [];

  return template.map((item) => {
    if (typeof item.value === 'string') {
      let resolved = item.value;
      for (const [key, value] of Object.entries(variables)) {
        resolved = resolved.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
      }
      return { ...item, value: resolved };
    }
    return item;
  });
}

// ==================== Interaction Routes ====================

/**
 * POST /api/v1/interactions/start
 * Start a new trace
 */
router.post('/interactions/start', (req: Request, res: Response) => {
  try {
    const validation = StartTraceSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validation.error.format(),
      });
    }

    const {
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
    } = validation.data;

    if (!promptTemplate && !promptVariables) {
      return res.status(400).json({
        success: false,
        error: 'Either promptTemplate or promptVariables must be provided',
      });
    }

    // Resolve prompts
    const prompts = resolvePrompts(promptTemplate || [], promptVariables || {});

    // Convert tools to unified format if provided
    const unifiedTools = tools && provider ? fromProviderFormat(tools, provider) : tools;

    const interaction = createInteraction({
      traceId: traceId || generateId(),
      agentId,
      flowId,
      threadId,
      sessionId,
      userId,
      provider: provider || '',
      model: model || '',
      prompts,
      promptTemplate,
      promptVariables,
      tools: unifiedTools,
      modelParams,
      metadata,
      tags,
      startTime: new Date(),
    });

    res.json({
      success: true,
      traceId: interaction.traceId,
      interaction,
    });
  } catch (error: any) {
    console.error('Error starting trace:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/interactions/append
 * Append LLM response to a trace
 */
router.post('/interactions/append', (req: Request, res: Response) => {
  try {
    const {
      traceId,
      rawResponse,
      provider,
      model,
      threadId,
      userId,
      agentId,
      flowId,
      sessionId,
    } = req.body;

    if (!traceId) {
      return res.status(400).json({
        success: false,
        error: 'traceId is required',
      });
    }

    const existing = getInteractionByTraceId(traceId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Trace not found',
      });
    }

    // Parse the raw response
    const providerToUse = provider || existing.provider;
    const modelToUse = model || existing.model;
    const parsed = parseResponse(rawResponse, providerToUse, modelToUse);

    // Build update data
    const updateData: Partial<Interaction> = {
      rawResponse,
    };

    if (parsed.responseText || parsed.responseContent) {
      updateData.responses = parsed.responseContent || [
        { type: 'text', role: 'assistant', value: parsed.responseText },
      ];
    }

    if (parsed.usage) {
      updateData.usage = parsed.usage;
    }

    if (parsed.toolCalls) {
      updateData.toolCalls = parsed.toolCalls;
    }

    // Update optional fields if provided
    if (threadId) updateData.threadId = threadId;
    if (userId) updateData.userId = userId;
    if (agentId) updateData.agentId = agentId;
    if (flowId) updateData.flowId = flowId;
    if (sessionId) updateData.sessionId = sessionId;

    const interaction = updateInteraction(traceId, updateData);

    res.json({
      success: true,
      traceId,
      interaction,
    });
  } catch (error: any) {
    console.error('Error appending response:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/interactions/finalize
 * Finalize a trace (calculate latency)
 */
router.post('/interactions/finalize', (req: Request, res: Response) => {
  try {
    const { traceId } = req.body;

    if (!traceId) {
      return res.status(400).json({
        success: false,
        error: 'traceId is required',
      });
    }

    const existing = getInteractionByTraceId(traceId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Trace not found',
      });
    }

    const endTime = new Date();
    const startTime = existing.startTime || existing.createdAt || endTime;
    const latencyMs = endTime.getTime() - new Date(startTime).getTime();

    const interaction = updateInteraction(traceId, {
      endTime,
      latencyMs,
    });

    res.json({
      success: true,
      traceId,
      interaction,
    });
  } catch (error: any) {
    console.error('Error finalizing trace:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/interactions/error
 * Log an error to a trace
 */
router.post('/interactions/error', (req: Request, res: Response) => {
  try {
    const { traceId, error } = req.body;

    if (!traceId) {
      return res.status(400).json({
        success: false,
        error: 'traceId is required',
      });
    }

    const existing = getInteractionByTraceId(traceId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Trace not found',
      });
    }

    const interaction = updateInteraction(traceId, {
      error: {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
      },
      endTime: new Date(),
    });

    res.json({
      success: true,
      traceId,
      interaction,
    });
  } catch (error: any) {
    console.error('Error logging error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/interactions/feedback
 * Add feedback to a trace
 */
router.post('/interactions/feedback', (req: Request, res: Response) => {
  try {
    const { traceId, feedback } = req.body;

    if (!traceId) {
      return res.status(400).json({
        success: false,
        error: 'traceId is required',
      });
    }

    const existing = getInteractionByTraceId(traceId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Trace not found',
      });
    }

    const interaction = updateInteraction(traceId, {
      feedback: {
        rating: feedback?.rating,
        comment: feedback?.comment,
        labels: feedback?.labels,
        submittedAt: new Date(),
      },
    });

    res.json({
      success: true,
      traceId,
      interaction,
    });
  } catch (error: any) {
    console.error('Error adding feedback:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/interactions/tool-execution
 * Add tool execution record
 */
router.post('/interactions/tool-execution', (req: Request, res: Response) => {
  try {
    const { traceId, toolId, toolName, executionTime, duration, success, error, result } =
      req.body;

    if (!traceId) {
      return res.status(400).json({
        success: false,
        error: 'traceId is required',
      });
    }

    const existing = getInteractionByTraceId(traceId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Trace not found',
      });
    }

    const toolsExecuted = existing.toolsExecuted || [];
    toolsExecuted.push({
      toolId,
      toolName,
      executionTime: executionTime ? new Date(executionTime) : new Date(),
      duration,
      success,
      error,
      result,
    });

    const interaction = updateInteraction(traceId, { toolsExecuted });

    res.json({
      success: true,
      traceId,
      interaction,
    });
  } catch (error: any) {
    console.error('Error adding tool execution:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/interactions/tool-results
 * Add tool results to a trace
 */
router.post('/interactions/tool-results', (req: Request, res: Response) => {
  try {
    const { traceId, toolResults } = req.body;

    if (!traceId) {
      return res.status(400).json({
        success: false,
        error: 'traceId is required',
      });
    }

    if (!Array.isArray(toolResults) || toolResults.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'toolResults must be a non-empty array',
      });
    }

    const existing = getInteractionByTraceId(traceId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Trace not found',
      });
    }

    const existingResults = existing.toolResults || [];
    const updatedResults = [...existingResults, ...toolResults];

    const interaction = updateInteraction(traceId, { toolResults: updatedResults });

    res.json({
      success: true,
      traceId,
      interaction,
    });
  } catch (error: any) {
    console.error('Error adding tool results:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/interactions/:traceId
 * Get interaction by trace ID
 */
router.get('/interactions/:traceId', (req: Request, res: Response) => {
  try {
    const { traceId } = req.params;
    const interaction = getInteractionByTraceId(traceId);

    if (!interaction) {
      return res.status(404).json({
        success: false,
        error: 'Trace not found',
      });
    }

    res.json({
      success: true,
      interaction,
    });
  } catch (error: any) {
    console.error('Error getting interaction:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/interactions
 * List interactions with pagination
 */
router.get('/interactions', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const agentId = req.query.agentId as string;
    const userId = req.query.userId as string;
    const provider = req.query.provider as string;
    const model = req.query.model as string;

    const { interactions, total } = listInteractions({
      limit,
      offset,
      agentId,
      userId,
      provider,
      model,
    });

    res.json({
      success: true,
      interactions,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error listing interactions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/analytics
 * Get analytics summary
 */
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const analytics = getAnalyticsSummary();

    res.json({
      success: true,
      analytics,
    });
  } catch (error: any) {
    console.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export { router };
