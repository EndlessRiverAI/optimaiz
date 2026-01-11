/**
 * Optimaiz Server
 *
 * Express server for LLM observability
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { initDatabase, closeDatabase } from './db/sqlite';
import { router as apiRouter } from './api/routes';

export interface ServerConfig {
  port?: number;
  host?: string;
  dbPath?: string;
  corsOrigins?: string | string[];
  logRequests?: boolean;
  staticPath?: string;
}

const DEFAULT_PORT = 3456;
const DEFAULT_HOST = '0.0.0.0';

/**
 * Create and configure Express server
 */
export function createServer(config: ServerConfig = {}): Express {
  const app = express();

  // Initialize database
  initDatabase({ path: config.dbPath });

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS
  app.use(
    cors({
      origin: config.corsOrigins || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Request logging
  if (config.logRequests !== false) {
    app.use(morgan('dev'));
  }

  // API routes
  app.use('/api/v1', apiRouter);

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Serve static dashboard UI if available
  const staticPath = config.staticPath || path.join(__dirname, '../ui/dist');
  app.use(express.static(staticPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req: Request, res: Response) => {
    const indexPath = path.join(staticPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(200).json({
          name: 'Optimaiz Server',
          version: '1.0.0',
          status: 'running',
          api: '/api/v1',
          docs: 'https://optimaiz.io/docs',
        });
      }
    });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  });

  return app;
}

/**
 * Start the server
 */
export function startServer(config: ServerConfig = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const app = createServer(config);
    const port = config.port || DEFAULT_PORT;
    const host = config.host || DEFAULT_HOST;

    const server = app.listen(port, host, () => {
      console.log('');
      console.log('  ╔═══════════════════════════════════════════════════════╗');
      console.log('  ║                                                       ║');
      console.log('  ║   🚀 Optimaiz Server is running                       ║');
      console.log('  ║                                                       ║');
      console.log(`  ║   Local:    http://localhost:${port.toString().padEnd(24)}║`);
      console.log(`  ║   Network:  http://${host}:${port.toString().padEnd(22)}║`);
      console.log('  ║                                                       ║');
      console.log('  ║   API:      /api/v1                                   ║');
      console.log('  ║   Health:   /health                                   ║');
      console.log('  ║                                                       ║');
      console.log('  ╚═══════════════════════════════════════════════════════╝');
      console.log('');
      resolve();
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      }
      reject(error);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('\nShutting down...');
      server.close(() => {
        closeDatabase();
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}
