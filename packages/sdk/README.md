# @endlessriver/optimaiz

**SDK for LLM observability** - Track costs, latency, and usage across all major LLM providers.

[![npm](https://img.shields.io/npm/v/@endlessriver/optimaiz)](https://www.npmjs.com/package/@endlessriver/optimaiz)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)

## Installation

```bash
npm install @endlessriver/optimaiz
# or
pnpm add @endlessriver/optimaiz
# or
yarn add @endlessriver/optimaiz
```

## Quick Start

```typescript
import { OptimaizClient } from '@endlessriver/optimaiz';
import OpenAI from 'openai';

// Initialize client
const optimaiz = new OptimaizClient({
  token: 'your-api-token',
  baseUrl: 'http://localhost:3456', // Local server (default)
  // baseUrl: 'https://api.optimaiz.io', // Cloud
});

const openai = new OpenAI();

// Option 1: Wrap your LLM calls (recommended)
const { response, traceId } = await optimaiz.wrapLLMCall({
  provider: 'openai',
  model: 'gpt-4',
  agentId: 'my-agent',
  promptTemplate: [
    { type: 'text', role: 'system', value: 'You are a helpful assistant.' },
    { type: 'text', role: 'user', value: 'Hello {name}!' },
  ],
  promptVariables: { name: 'World' },
  call: () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello World!' },
    ],
  }),
});

// Option 2: Manual tracing
const trace = await optimaiz.startTrace({
  provider: 'openai',
  model: 'gpt-4',
  promptTemplate: [{ type: 'text', role: 'user', value: 'Hello!' }],
});

const response = await openai.chat.completions.create({ ... });

await optimaiz.appendResponse({
  traceId: trace.traceId,
  rawResponse: response,
});

await optimaiz.finalizeTrace(trace.traceId);
```

## Features

### Multi-Provider Support

Works with all major LLM providers:

- **OpenAI** - GPT-5.2, GPT-4o, o1, o3, DALL-E, etc.
- **Anthropic** - Claude Opus 4.5, Sonnet, Haiku
- **Google** - Gemini 3, 2.5, Veo
- **Mistral** - Large, Small, Codestral
- **Cohere** - Command R, R+
- **Perplexity** - Sonar, Sonar Pro

### Prompt Templates

Separate your prompt templates from variables for better tracking:

```typescript
const { prompts, promptTemplate, promptVariables } = optimaiz.composePrompts(
  [
    { role: 'system', content: 'You are {persona}.' },
    { role: 'user', content: 'Help me with {task}.' },
  ],
  {
    persona: 'a helpful assistant',
    task: 'writing code',
  }
);
```

### Tool/Function Calls

Convert tools between provider formats:

```typescript
// Define tools in unified format
const tools = [
  {
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name' },
      },
      required: ['location'],
    },
  },
];

// Convert to OpenAI format
const openaiTools = optimaiz.convertToolsToProvider(tools, 'openai');

// Convert to Anthropic format
const anthropicTools = optimaiz.convertToolsToProvider(tools, 'anthropic');

// Validate tools
const { valid, errors } = optimaiz.validateTools(tools);
```

### Error Handling

```typescript
import {
  OptimaizError,
  isAuthenticationError,
  isValidationError,
} from '@endlessriver/optimaiz';

try {
  await optimaiz.startTrace({ ... });
} catch (error) {
  if (isAuthenticationError(error)) {
    console.log('Invalid token');
  } else if (isValidationError(error)) {
    console.log('Invalid request:', error.details);
  }
}
```

### Feedback Collection

```typescript
await optimaiz.sendFeedback(traceId, {
  rating: 'up', // or 'down'
  comment: 'Great response!',
  labels: ['accurate', 'helpful'],
});
```

## API Reference

### Constructor

```typescript
new OptimaizClient(config: OptimaixConfig)

interface OptimaixConfig {
  token: string;          // API token
  baseUrl?: string;       // Server URL (default: http://localhost:3456)
  timeout?: number;       // Request timeout in ms (default: 30000)
  retries?: number;       // Number of retries (default: 0)
  debug?: boolean;        // Enable debug logging (default: false)
}
```

### Methods

#### `wrapLLMCall<T>(options): Promise<{ response: T; traceId: string }>`

High-level wrapper for LLM calls with automatic tracing.

```typescript
const { response, traceId } = await client.wrapLLMCall({
  traceId?: string,           // Optional custom trace ID
  agentId?: string,           // Agent identifier
  flowId?: string,            // Flow identifier
  threadId?: string,          // Thread identifier
  sessionId?: string,         // Session identifier
  userId?: string,            // User identifier
  promptTemplate?: MessageContent[],
  promptVariables?: Record<string, string>,
  tools?: ToolDefinition[],
  provider: string,           // 'openai', 'anthropic', etc.
  model: string,              // 'gpt-4', 'claude-3-opus', etc.
  modelParams?: Record<string, any>,
  metadata?: Record<string, any>,
  tags?: string[],
  call: () => Promise<T>,     // Your LLM call
});
```

#### `startTrace(data): Promise<TraceResponse>`

Start a new trace.

#### `appendResponse(data): Promise<TraceResponse>`

Append LLM response to a trace.

#### `finalizeTrace(traceId): Promise<TraceResponse>`

Finalize a trace (calculates latency).

#### `logError(traceId, error): Promise<TraceResponse>`

Log an error to a trace.

#### `sendFeedback(traceId, feedback): Promise<TraceResponse>`

Send feedback for a trace.

#### `addToolExecution(data): Promise<TraceResponse>`

Add tool execution record.

#### `addToolResults(data): Promise<TraceResponse>`

Add tool results to a trace.

#### `composePrompts(templates, variables): { prompts, promptTemplate, promptVariables }`

Compose prompts from templates and variables.

#### `convertToolsToProvider(tools, provider): any[]`

Convert unified tools to provider format.

#### `convertToolsFromProvider(tools, provider): ToolDefinition[]`

Convert provider tools to unified format.

#### `validateTools(tools): { valid: boolean; errors: string[] }`

Validate tool definitions.

## Types

```typescript
// Message content (multi-modal)
interface MessageContent {
  type: 'text' | 'image' | 'audio' | 'video';
  role: 'system' | 'user' | 'assistant' | 'tool';
  value: string;
  mimeType?: string;
}

// Tool definition
interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

// Feedback
interface Feedback {
  rating?: 'up' | 'down';
  comment?: string;
  labels?: string[];
}
```

## License

MIT - see [LICENSE](../../LICENSE)
