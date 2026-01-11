# @optimaiz/server

**Self-hosted LLM observability server** - Track and visualize all your LLM interactions locally.

[![npm](https://img.shields.io/npm/v/@optimaiz/server)](https://www.npmjs.com/package/@optimaiz/server)
[![Docker](https://img.shields.io/docker/v/optimaiz/server?label=docker)](https://hub.docker.com/r/optimaiz/server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)

## Quick Start

### Option 1: npx (Recommended)

```bash
npx @optimaiz/server
```

Server starts at http://localhost:3456

### Option 2: Docker

```bash
docker run -p 3456:3456 -v optimaiz-data:/data optimaiz/server
```

### Option 3: Docker Compose

```bash
docker-compose up -d
```

### Option 4: Global Install

```bash
npm install -g @optimaiz/server
optimaiz-server
```

## Configuration

### CLI Options

```bash
optimaiz-server [options]

Options:
  -p, --port <port>     Port to listen on (default: 3456)
  -h, --host <host>     Host to bind to (default: 0.0.0.0)
  -d, --db <path>       SQLite database path (default: ./optimaiz.db)
  --cors <origins>      CORS origins (comma-separated)
  -q, --quiet           Disable request logging
  -v, --version         Show version
  --help                Show help

Examples:
  optimaiz-server
  optimaiz-server --port 8080
  optimaiz-server --db ./data/llm.db --port 3000
```

### Programmatic Usage

```typescript
import { createServer, startServer } from '@optimaiz/server';

// Quick start
await startServer({ port: 3456 });

// Or create custom Express app
const app = createServer({
  port: 3456,
  dbPath: './data/llm.db',
  corsOrigins: ['http://localhost:3000'],
  logRequests: true,
});

app.listen(3456);
```

## Features

### Dashboard

Access the built-in dashboard at http://localhost:3456

- View all interactions
- See token usage and costs
- Monitor latency
- Filter by provider, model, agent

### API

Full REST API for logging and querying interactions:

```
POST /api/v1/interactions/start      # Start a trace
POST /api/v1/interactions/append     # Append response
POST /api/v1/interactions/finalize   # Finalize trace
POST /api/v1/interactions/error      # Log error
POST /api/v1/interactions/feedback   # Add feedback
POST /api/v1/interactions/tool-execution
POST /api/v1/interactions/tool-results
GET  /api/v1/interactions            # List interactions
GET  /api/v1/interactions/:traceId   # Get interaction
GET  /api/v1/analytics               # Get analytics
GET  /health                         # Health check
```

### Core Module

Import parsers and cost estimation for your own server:

```typescript
import {
  parseResponse,
  estimateCost,
  extractTokens,
  toProviderFormat,
} from '@optimaiz/server/core';

// Parse raw LLM response
const parsed = parseResponse(rawResponse, 'openai', 'gpt-4');
// { responseText, usage, toolCalls, ... }

// Estimate cost
const cost = estimateCost({
  provider: 'openai',
  model: 'gpt-4',
  promptTokens: 100,
  completionTokens: 50,
});
// 0.0045

// Convert tools to provider format
const openaiTools = toProviderFormat(tools, 'openai');
```

## Database

Uses SQLite by default - no configuration required.

Data is stored in `./optimaiz.db` (or custom path via `--db`).

### Schema

```sql
interactions (
  id, trace_id, agent_id, flow_id, thread_id, session_id, user_id,
  provider, model,
  prompts, prompt_template, prompt_variables,
  tools, responses, model_params,
  prompt_tokens, completion_tokens, total_tokens, cost,
  tool_calls, tool_results, tools_executed,
  error, raw_request, raw_response,
  feedback_rating, feedback_comment, feedback_labels,
  metadata, tags,
  start_time, end_time, latency_ms,
  created_at, updated_at
)
```

## Docker

### Build

```bash
docker build -t optimaiz/server .
```

### Run

```bash
# Basic
docker run -p 3456:3456 optimaiz/server

# With persistent data
docker run -p 3456:3456 -v optimaiz-data:/data optimaiz/server

# Custom port
docker run -p 8080:8080 -e PORT=8080 optimaiz/server
```

### Compose

```yaml
version: '3.8'
services:
  optimaiz:
    image: optimaiz/server:latest
    ports:
      - "3456:3456"
    volumes:
      - optimaiz-data:/data
    restart: unless-stopped

volumes:
  optimaiz-data:
```

## Supported Providers

| Provider | Cost | Tokens | Parsing | Tool Calls |
|----------|------|--------|---------|------------|
| OpenAI | ✅ | ✅ | ✅ | ✅ |
| Anthropic | ✅ | ✅ | ✅ | ✅ |
| Google Gemini | ✅ | ✅ | ✅ | ✅ |
| Mistral | ✅ | ✅ | ✅ | ✅ |
| Cohere | ✅ | ✅ | ✅ | - |
| Perplexity | ✅ | ✅ | ✅ | ✅ |
| Grok | ✅ | ✅ | ✅ | - |

## License

MIT - see [LICENSE](../../LICENSE)
