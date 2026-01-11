/**
 * @optimaiz/server
 *
 * Open-source LLM observability server
 *
 * @example
 * ```typescript
 * import { createServer, startServer } from '@optimaiz/server';
 *
 * // Quick start
 * startServer({ port: 3456 });
 *
 * // Or create custom server
 * const app = createServer({ dbPath: './data/llm.db' });
 * app.listen(3456);
 * ```
 */

// Server
export { createServer, startServer, type ServerConfig } from './server';

// Database
export {
  initDatabase,
  getDatabase,
  closeDatabase,
  createInteraction,
  getInteractionById,
  getInteractionByTraceId,
  updateInteraction,
  listInteractions,
  getAnalyticsSummary,
  type DatabaseConfig,
} from './db/sqlite';

// Re-export core module
export * from './core';
