#!/usr/bin/env node
/**
 * Optimaiz Server CLI
 *
 * Usage:
 *   npx @optimaiz/server
 *   optimaiz-server
 *   optimaiz-server --port 8080
 *   optimaiz-server --db ./data/my.db
 */

import { startServer, ServerConfig } from './server';

function parseArgs(): ServerConfig {
  const args = process.argv.slice(2);
  const config: ServerConfig = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--port':
      case '-p':
        config.port = parseInt(next, 10);
        i++;
        break;

      case '--host':
      case '-h':
        config.host = next;
        i++;
        break;

      case '--db':
      case '-d':
        config.dbPath = next;
        i++;
        break;

      case '--cors':
        config.corsOrigins = next?.split(',') || '*';
        i++;
        break;

      case '--quiet':
      case '-q':
        config.logRequests = false;
        break;

      case '--help':
        printHelp();
        process.exit(0);

      case '--version':
      case '-v':
        console.log('1.0.0');
        process.exit(0);
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
Optimaiz Server - Open-source LLM Observability

Usage:
  optimaiz-server [options]

Options:
  -p, --port <port>     Port to listen on (default: 3456)
  -h, --host <host>     Host to bind to (default: 0.0.0.0)
  -d, --db <path>       SQLite database path (default: ./optimaiz.db)
  --cors <origins>      CORS origins (comma-separated)
  -q, --quiet           Disable request logging
  -v, --version         Show version
  --help                Show this help

Examples:
  optimaiz-server
  optimaiz-server --port 8080
  optimaiz-server --db ./data/llm.db --port 3000
  optimaiz-server --cors http://localhost:3000,http://localhost:5173

Documentation:
  https://optimaiz.io/docs
  https://github.com/optimaiz/optimaiz
`);
}

// Main entry point
const config = parseArgs();

startServer(config).catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
