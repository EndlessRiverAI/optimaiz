# Optimaiz Development Guide

Complete reference for developing and maintaining the Optimaiz OSS project.

## Project Structure

```
optimaiz/
├── packages/
│   ├── sdk/                      # @optimaiz/sdk - Client SDK
│   │   ├── src/
│   │   │   ├── index.ts          # Main exports
│   │   │   ├── client.ts         # OptimaizClient class
│   │   │   ├── types.ts          # TypeScript interfaces
│   │   │   ├── errors.ts         # Custom error classes
│   │   │   └── tools.ts          # Tool format conversion
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── server/                   # @optimaiz/server - Self-hosted server
│       ├── src/
│       │   ├── core/             # Shared logic (exported for cloud)
│       │   │   ├── index.ts      # Core exports
│       │   │   ├── types.ts      # Shared types
│       │   │   ├── pricing.ts    # Model pricing table
│       │   │   ├── cost.ts       # Cost estimation
│       │   │   ├── tokens.ts     # Token extraction
│       │   │   ├── parsers.ts    # Response parsers
│       │   │   └── tools.ts      # Tool utilities
│       │   ├── api/
│       │   │   └── routes.ts     # Express API routes
│       │   ├── db/
│       │   │   └── sqlite.ts     # SQLite database adapter
│       │   ├── server.ts         # Express server setup
│       │   ├── cli.ts            # CLI entry point
│       │   └── index.ts          # Main exports
│       ├── ui/
│       │   └── dist/
│       │       └── index.html    # Dashboard (single HTML file)
│       ├── Dockerfile
│       ├── docker-compose.yml
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       └── README.md
│
├── package.json                  # Workspace root
├── pnpm-workspace.yaml           # pnpm workspace config
├── LICENSE                       # MIT
├── README.md                     # Public-facing docs
└── DEVELOPMENT.md                # This file
```

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Initial Setup

```bash
# Navigate to project
cd /Users/ishaan/Documents/LLMOps/optimaiz

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start server in dev mode
pnpm dev
```

Server runs at http://localhost:3456

### Development Commands

```bash
# Root commands
pnpm build          # Build all packages
pnpm dev            # Run server in dev mode (with watch)
pnpm test           # Run all tests
pnpm lint           # Lint all packages
pnpm clean          # Clean all dist folders

# Package-specific
pnpm --filter @endlessriver/optimaiz build
pnpm --filter @endlessriver/optimaiz dev
pnpm --filter @optimaiz/server build
pnpm --filter @optimaiz/server dev
```

## Package Details

### @endlessriver/optimaiz

Client SDK for instrumenting LLM calls.

**Key Files:**
- `src/client.ts` - Main `OptimaizClient` class
- `src/types.ts` - All TypeScript interfaces
- `src/tools.ts` - Tool format conversion utilities

**Main Methods:**
```typescript
client.wrapLLMCall()      // High-level wrapper (recommended)
client.startTrace()       // Start new trace
client.appendResponse()   // Add LLM response
client.finalizeTrace()    // Calculate latency
client.logError()         // Log errors
client.sendFeedback()     // Add feedback
client.addToolExecution() // Track tool calls
```

**Build:**
```bash
cd packages/sdk
pnpm build    # Outputs to dist/
```

### @optimaiz/server

Self-hosted observability server.

**Key Files:**
- `src/server.ts` - Express server setup
- `src/cli.ts` - CLI entry point (`optimaiz-server` command)
- `src/api/routes.ts` - All API endpoints
- `src/db/sqlite.ts` - Database operations
- `src/core/` - Shared logic (parsers, cost, etc.)

**API Endpoints:**
```
POST /api/v1/interactions/start
POST /api/v1/interactions/append
POST /api/v1/interactions/finalize
POST /api/v1/interactions/error
POST /api/v1/interactions/feedback
POST /api/v1/interactions/tool-execution
POST /api/v1/interactions/tool-results
GET  /api/v1/interactions
GET  /api/v1/interactions/:traceId
GET  /api/v1/analytics
GET  /health
```

**Build:**
```bash
cd packages/server
pnpm build         # Build server + core
pnpm build:server  # Build server only
```

### Core Module

The `src/core/` directory contains shared logic that can be imported by `optimaiz-cloud`:

```typescript
// From optimaiz-cloud, after publishing:
import {
  parseResponse,
  estimateCost,
  extractTokens,
  toProviderFormat,
  modelPricing,
} from '@optimaiz/server/core';
```

**What's in Core:**
| File | Purpose |
|------|---------|
| `types.ts` | Shared TypeScript interfaces |
| `pricing.ts` | Model pricing table (per 1K tokens) |
| `cost.ts` | Cost estimation logic |
| `tokens.ts` | Token extraction from responses |
| `parsers.ts` | Parse raw LLM responses |
| `tools.ts` | Tool format conversion |

## Database Schema

SQLite database (`optimaiz.db`):

```sql
interactions (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  agent_id TEXT,
  flow_id TEXT,
  thread_id TEXT,
  session_id TEXT,
  user_id TEXT,

  provider TEXT NOT NULL,
  model TEXT NOT NULL,

  prompts TEXT,              -- JSON
  prompt_template TEXT,      -- JSON
  prompt_variables TEXT,     -- JSON

  tools TEXT,                -- JSON
  responses TEXT,            -- JSON
  model_params TEXT,         -- JSON

  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost REAL,

  tool_calls TEXT,           -- JSON
  tool_results TEXT,         -- JSON
  tools_executed TEXT,       -- JSON

  error TEXT,                -- JSON
  raw_request TEXT,          -- JSON
  raw_response TEXT,         -- JSON

  feedback_rating TEXT,
  feedback_comment TEXT,
  feedback_labels TEXT,      -- JSON

  metadata TEXT,             -- JSON
  tags TEXT,                 -- JSON

  start_time TEXT,
  end_time TEXT,
  latency_ms INTEGER,

  created_at TEXT,
  updated_at TEXT
)
```

**Indexes:** trace_id, agent_id, flow_id, user_id, provider, model, created_at

## Adding New LLM Providers

### 1. Add Pricing

Edit `packages/server/src/core/pricing.ts`:

```typescript
export const modelPricing: Record<string, ModelPricing> = {
  // ... existing providers

  // Add new provider
  'newprovider:model-name': {
    promptPricePer1K: 0.001,
    completionPricePer1K: 0.002,
    lastUpdated: '2025-01',
  },
};
```

### 2. Add Token Extractor

Edit `packages/server/src/core/tokens.ts`:

```typescript
export function extractNewProviderTokens(rawResponse: any): TokenUsage | null {
  try {
    const usage = rawResponse?.usage;
    if (!usage) return null;

    return {
      promptTokens: Number(usage.input_tokens) || 0,
      completionTokens: Number(usage.output_tokens) || 0,
      totalTokens: /* calculate */,
    };
  } catch {
    return null;
  }
}

// Add to extractTokens() switch statement
export function extractTokens(rawResponse: any, provider: string): TokenUsage | null {
  const lowerProvider = provider.toLowerCase();

  // ... existing providers

  if (lowerProvider.includes('newprovider')) {
    return extractNewProviderTokens(rawResponse);
  }

  return extractTokensUniversal(rawResponse);
}
```

### 3. Add Response Parser

Edit `packages/server/src/core/parsers.ts`:

```typescript
function parseNewProvider(raw: any, provider: string, model: string): ParsedResponse {
  // Extract response text
  const responseText = raw?.choices?.[0]?.message?.content || '';

  // Extract tokens
  const tokenUsage = extractTokens(raw, provider);

  return {
    responseText,
    usage: tokenUsage ? {
      ...tokenUsage,
      cost: estimateCost({
        provider,
        model,
        promptTokens: tokenUsage.promptTokens,
        completionTokens: tokenUsage.completionTokens,
      }),
    } : undefined,
  };
}

// Add to parseResponse() router
export function parseResponse(rawResponse: any, provider: string, model: string): ParsedResponse {
  // ... existing providers

  if (lowerProvider.includes('newprovider')) {
    return parseNewProvider(rawResponse, provider, model);
  }

  return parseFallback(rawResponse);
}
```

## Docker

### Build Image

```bash
cd packages/server
docker build -t optimaiz/server .
```

### Run Container

```bash
# Basic
docker run -p 3456:3456 optimaiz/server

# With persistent data
docker run -p 3456:3456 -v optimaiz-data:/data optimaiz/server
```

### Docker Compose

```bash
docker-compose up -d      # Start
docker-compose down       # Stop
docker-compose logs -f    # View logs
```

## Publishing to npm

### 1. Update Versions

```bash
# Update version in each package.json
cd packages/sdk && npm version patch
cd packages/server && npm version patch
```

### 2. Build

```bash
pnpm build
```

### 3. Publish

```bash
cd packages/sdk && npm publish --access public
cd packages/server && npm publish --access public
```

## Integration with optimaiz-cloud

The cloud version can import the core module:

```typescript
// In optimaiz-cloud
import {
  parseResponse,
  estimateCost,
  extractTokens,
  modelPricing,
  toProviderFormat,
  fromProviderFormat,
} from '@optimaiz/server/core';

// Use in your existing services
const parsed = parseResponse(rawResponse, 'openai', 'gpt-4');
const cost = estimateCost({ provider, model, promptTokens, completionTokens });
```

**After publishing**, update `optimaiz-cloud/package.json`:

```json
{
  "dependencies": {
    "@optimaiz/server": "^1.0.0"
  }
}
```

Then replace local implementations with imports from core.

## Testing the SDK

```typescript
import { OptimaizClient } from '@endlessriver/optimaiz';

const client = new OptimaizClient({
  token: 'test-token',
  baseUrl: 'http://localhost:3456',
  debug: true,  // Enable logging
});

// Test trace
const { response, traceId } = await client.wrapLLMCall({
  provider: 'openai',
  model: 'gpt-4',
  promptTemplate: [{ type: 'text', role: 'user', value: 'Hello!' }],
  call: async () => ({ choices: [{ message: { content: 'Hi!' } }] }),
});

console.log('Trace:', traceId);
```

## File Reference

| File | Description |
|------|-------------|
| `packages/sdk/src/client.ts` | Main SDK client class |
| `packages/sdk/src/types.ts` | SDK TypeScript types |
| `packages/sdk/src/errors.ts` | Error classes |
| `packages/sdk/src/tools.ts` | Tool conversion |
| `packages/server/src/server.ts` | Express server |
| `packages/server/src/cli.ts` | CLI entry point |
| `packages/server/src/api/routes.ts` | API endpoints |
| `packages/server/src/db/sqlite.ts` | Database operations |
| `packages/server/src/core/pricing.ts` | Model pricing |
| `packages/server/src/core/cost.ts` | Cost estimation |
| `packages/server/src/core/tokens.ts` | Token extraction |
| `packages/server/src/core/parsers.ts` | Response parsing |
| `packages/server/src/core/tools.ts` | Tool utilities |
| `packages/server/ui/dist/index.html` | Dashboard UI |

## Troubleshooting

### Port already in use

```bash
optimaiz-server --port 8080
```

### Database locked

Stop any other instances, or use a different db path:

```bash
optimaiz-server --db ./other.db
```

### Build errors

```bash
pnpm clean
pnpm install
pnpm build
```

### Debug mode

```typescript
const client = new OptimaizClient({
  token: 'test',
  debug: true,  // Logs all requests
});
```
