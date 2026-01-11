/**
 * SQLite Database Adapter
 *
 * Simple, zero-config database for self-hosted deployments
 */

import Database from 'better-sqlite3';
import type { Interaction } from '../core/types';

let db: Database.Database | null = null;

export interface DatabaseConfig {
  path?: string;
}

/**
 * Initialize SQLite database
 */
export function initDatabase(config: DatabaseConfig = {}): Database.Database {
  const dbPath = config.path || './optimaiz.db';

  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL,
      agent_id TEXT,
      flow_id TEXT,
      thread_id TEXT,
      session_id TEXT,
      user_id TEXT,

      provider TEXT NOT NULL,
      model TEXT NOT NULL,

      prompts TEXT,
      prompt_template TEXT,
      prompt_variables TEXT,

      tools TEXT,
      responses TEXT,
      model_params TEXT,

      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      cost REAL,

      tool_calls TEXT,
      tool_results TEXT,
      tools_executed TEXT,

      error TEXT,
      raw_request TEXT,
      raw_response TEXT,

      feedback_rating TEXT,
      feedback_comment TEXT,
      feedback_labels TEXT,
      feedback_submitted_at TEXT,

      metadata TEXT,
      tags TEXT,

      start_time TEXT,
      end_time TEXT,
      latency_ms INTEGER,

      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_trace_id ON interactions(trace_id);
    CREATE INDEX IF NOT EXISTS idx_agent_id ON interactions(agent_id);
    CREATE INDEX IF NOT EXISTS idx_flow_id ON interactions(flow_id);
    CREATE INDEX IF NOT EXISTS idx_user_id ON interactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_provider ON interactions(provider);
    CREATE INDEX IF NOT EXISTS idx_model ON interactions(model);
    CREATE INDEX IF NOT EXISTS idx_created_at ON interactions(created_at);
  `);

  return db;
}

/**
 * Get database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

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
 * Create interaction
 */
export function createInteraction(data: Partial<Interaction>): Interaction {
  const database = getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO interactions (
      id, trace_id, agent_id, flow_id, thread_id, session_id, user_id,
      provider, model,
      prompts, prompt_template, prompt_variables,
      tools, responses, model_params,
      prompt_tokens, completion_tokens, total_tokens, cost,
      tool_calls, tool_results, tools_executed,
      error, raw_request, raw_response,
      metadata, tags,
      start_time, end_time, latency_ms,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?
    )
  `);

  stmt.run(
    id,
    data.traceId || generateId(),
    data.agentId || null,
    data.flowId || null,
    data.threadId || null,
    data.sessionId || null,
    data.userId || null,
    data.provider || '',
    data.model || '',
    JSON.stringify(data.prompts || []),
    JSON.stringify(data.promptTemplate || null),
    JSON.stringify(data.promptVariables || null),
    JSON.stringify(data.tools || null),
    JSON.stringify(data.responses || null),
    JSON.stringify(data.modelParams || null),
    data.usage?.promptTokens || 0,
    data.usage?.completionTokens || 0,
    data.usage?.totalTokens || 0,
    data.usage?.cost || null,
    JSON.stringify(data.toolCalls || null),
    JSON.stringify(data.toolResults || null),
    JSON.stringify(data.toolsExecuted || null),
    JSON.stringify(data.error || null),
    JSON.stringify(data.rawRequest || null),
    JSON.stringify(data.rawResponse || null),
    JSON.stringify(data.metadata || null),
    JSON.stringify(data.tags || null),
    data.startTime?.toISOString() || now,
    data.endTime?.toISOString() || null,
    data.latencyMs || null,
    now,
    now
  );

  return getInteractionById(id)!;
}

/**
 * Get interaction by ID
 */
export function getInteractionById(id: string): Interaction | null {
  const database = getDatabase();
  const row = database.prepare('SELECT * FROM interactions WHERE id = ?').get(id) as any;
  return row ? rowToInteraction(row) : null;
}

/**
 * Get interaction by trace ID
 */
export function getInteractionByTraceId(traceId: string): Interaction | null {
  const database = getDatabase();
  const row = database
    .prepare('SELECT * FROM interactions WHERE trace_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(traceId) as any;
  return row ? rowToInteraction(row) : null;
}

/**
 * Update interaction
 */
export function updateInteraction(
  traceId: string,
  data: Partial<Interaction>
): Interaction | null {
  const database = getDatabase();
  const now = new Date().toISOString();

  const existing = getInteractionByTraceId(traceId);
  if (!existing) return null;

  const updates: string[] = [];
  const values: any[] = [];

  if (data.responses !== undefined) {
    updates.push('responses = ?');
    values.push(JSON.stringify(data.responses));
  }

  if (data.usage !== undefined) {
    updates.push('prompt_tokens = ?, completion_tokens = ?, total_tokens = ?, cost = ?');
    values.push(
      data.usage.promptTokens,
      data.usage.completionTokens,
      data.usage.totalTokens,
      data.usage.cost || null
    );
  }

  if (data.toolCalls !== undefined) {
    updates.push('tool_calls = ?');
    values.push(JSON.stringify(data.toolCalls));
  }

  if (data.toolResults !== undefined) {
    updates.push('tool_results = ?');
    values.push(JSON.stringify(data.toolResults));
  }

  if (data.toolsExecuted !== undefined) {
    updates.push('tools_executed = ?');
    values.push(JSON.stringify(data.toolsExecuted));
  }

  if (data.error !== undefined) {
    updates.push('error = ?');
    values.push(JSON.stringify(data.error));
  }

  if (data.rawResponse !== undefined) {
    updates.push('raw_response = ?');
    values.push(JSON.stringify(data.rawResponse));
  }

  if (data.feedback !== undefined) {
    updates.push(
      'feedback_rating = ?, feedback_comment = ?, feedback_labels = ?, feedback_submitted_at = ?'
    );
    values.push(
      data.feedback.rating || null,
      data.feedback.comment || null,
      JSON.stringify(data.feedback.labels || null),
      data.feedback.submittedAt?.toISOString() || now
    );
  }

  if (data.endTime !== undefined) {
    updates.push('end_time = ?');
    values.push(data.endTime.toISOString());
  }

  if (data.latencyMs !== undefined) {
    updates.push('latency_ms = ?');
    values.push(data.latencyMs);
  }

  if (updates.length === 0) return existing;

  updates.push('updated_at = ?');
  values.push(now);
  values.push(traceId);

  database
    .prepare(`UPDATE interactions SET ${updates.join(', ')} WHERE trace_id = ?`)
    .run(...values);

  return getInteractionByTraceId(traceId);
}

/**
 * List interactions with pagination
 */
export function listInteractions(options: {
  limit?: number;
  offset?: number;
  agentId?: string;
  userId?: string;
  provider?: string;
  model?: string;
}): { interactions: Interaction[]; total: number } {
  const database = getDatabase();
  const { limit = 50, offset = 0 } = options;

  let whereClause = '1=1';
  const params: any[] = [];

  if (options.agentId) {
    whereClause += ' AND agent_id = ?';
    params.push(options.agentId);
  }

  if (options.userId) {
    whereClause += ' AND user_id = ?';
    params.push(options.userId);
  }

  if (options.provider) {
    whereClause += ' AND provider = ?';
    params.push(options.provider);
  }

  if (options.model) {
    whereClause += ' AND model = ?';
    params.push(options.model);
  }

  const countRow = database
    .prepare(`SELECT COUNT(*) as count FROM interactions WHERE ${whereClause}`)
    .get(...params) as { count: number };

  const rows = database
    .prepare(
      `SELECT * FROM interactions WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as any[];

  return {
    interactions: rows.map(rowToInteraction),
    total: countRow.count,
  };
}

/**
 * Get analytics summary
 */
export function getAnalyticsSummary(): {
  totalInteractions: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  byProvider: Record<string, { count: number; tokens: number; cost: number }>;
  byModel: Record<string, { count: number; tokens: number; cost: number }>;
} {
  const database = getDatabase();

  const summary = database
    .prepare(
      `
    SELECT
      COUNT(*) as total_interactions,
      SUM(total_tokens) as total_tokens,
      SUM(cost) as total_cost,
      AVG(latency_ms) as avg_latency
    FROM interactions
  `
    )
    .get() as any;

  const byProvider = database
    .prepare(
      `
    SELECT
      provider,
      COUNT(*) as count,
      SUM(total_tokens) as tokens,
      SUM(cost) as cost
    FROM interactions
    GROUP BY provider
  `
    )
    .all() as any[];

  const byModel = database
    .prepare(
      `
    SELECT
      model,
      COUNT(*) as count,
      SUM(total_tokens) as tokens,
      SUM(cost) as cost
    FROM interactions
    GROUP BY model
  `
    )
    .all() as any[];

  return {
    totalInteractions: summary.total_interactions || 0,
    totalTokens: summary.total_tokens || 0,
    totalCost: summary.total_cost || 0,
    avgLatency: summary.avg_latency || 0,
    byProvider: byProvider.reduce((acc, row) => {
      acc[row.provider] = { count: row.count, tokens: row.tokens || 0, cost: row.cost || 0 };
      return acc;
    }, {}),
    byModel: byModel.reduce((acc, row) => {
      acc[row.model] = { count: row.count, tokens: row.tokens || 0, cost: row.cost || 0 };
      return acc;
    }, {}),
  };
}

/**
 * Convert database row to Interaction object
 */
function rowToInteraction(row: any): Interaction {
  return {
    id: row.id,
    traceId: row.trace_id,
    agentId: row.agent_id || undefined,
    flowId: row.flow_id || undefined,
    threadId: row.thread_id || undefined,
    sessionId: row.session_id || undefined,
    userId: row.user_id || undefined,
    provider: row.provider,
    model: row.model,
    prompts: parseJSON(row.prompts) || [],
    promptTemplate: parseJSON(row.prompt_template),
    promptVariables: parseJSON(row.prompt_variables),
    tools: parseJSON(row.tools),
    responses: parseJSON(row.responses),
    modelParams: parseJSON(row.model_params),
    usage:
      row.total_tokens > 0
        ? {
            promptTokens: row.prompt_tokens,
            completionTokens: row.completion_tokens,
            totalTokens: row.total_tokens,
            cost: row.cost || undefined,
          }
        : undefined,
    toolCalls: parseJSON(row.tool_calls),
    toolResults: parseJSON(row.tool_results),
    toolsExecuted: parseJSON(row.tools_executed),
    error: parseJSON(row.error),
    rawRequest: parseJSON(row.raw_request),
    rawResponse: parseJSON(row.raw_response),
    feedback: row.feedback_rating
      ? {
          rating: row.feedback_rating,
          comment: row.feedback_comment || undefined,
          labels: parseJSON(row.feedback_labels),
          submittedAt: row.feedback_submitted_at
            ? new Date(row.feedback_submitted_at)
            : undefined,
        }
      : undefined,
    metadata: parseJSON(row.metadata),
    tags: parseJSON(row.tags),
    startTime: row.start_time ? new Date(row.start_time) : undefined,
    endTime: row.end_time ? new Date(row.end_time) : undefined,
    latencyMs: row.latency_ms || undefined,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

function parseJSON(value: string | null): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
