/**
 * LLM Model Pricing Table
 *
 * Pricing is per 1,000 tokens (1K tokens)
 * Last updated: January 2025
 */

export interface ModelPricing {
  promptPricePer1K: number;
  completionPricePer1K: number;
  lastUpdated?: string;
}

export const modelPricing: Record<string, ModelPricing> = {
  // OpenAI - Updated January 2025
  'openai:gpt-5.2': {
    promptPricePer1K: 0.00175,
    completionPricePer1K: 0.014,
    lastUpdated: '2025-01',
  },
  'openai:gpt-5.2-pro': {
    promptPricePer1K: 0.021,
    completionPricePer1K: 0.168,
    lastUpdated: '2025-01',
  },
  'openai:gpt-5': {
    promptPricePer1K: 0.00125,
    completionPricePer1K: 0.01,
    lastUpdated: '2025-01',
  },
  'openai:gpt-5-mini': {
    promptPricePer1K: 0.00025,
    completionPricePer1K: 0.002,
    lastUpdated: '2025-01',
  },
  'openai:gpt-5-pro': {
    promptPricePer1K: 0.015,
    completionPricePer1K: 0.12,
    lastUpdated: '2025-01',
  },
  'openai:gpt-4.1': {
    promptPricePer1K: 0.002,
    completionPricePer1K: 0.008,
  },
  'openai:gpt-4.1-mini': {
    promptPricePer1K: 0.0004,
    completionPricePer1K: 0.0016,
  },
  'openai:gpt-4.1-nano': {
    promptPricePer1K: 0.0001,
    completionPricePer1K: 0.0004,
  },
  'openai:gpt-4.5-preview': {
    promptPricePer1K: 0.075,
    completionPricePer1K: 0.15,
  },
  'openai:gpt-4o': {
    promptPricePer1K: 0.0025,
    completionPricePer1K: 0.01,
  },
  'openai:gpt-4o-mini': {
    promptPricePer1K: 0.00015,
    completionPricePer1K: 0.0006,
  },
  'openai:o1': {
    promptPricePer1K: 0.015,
    completionPricePer1K: 0.06,
  },
  'openai:o1-pro': {
    promptPricePer1K: 0.15,
    completionPricePer1K: 0.6,
  },
  'openai:o3': {
    promptPricePer1K: 0.002,
    completionPricePer1K: 0.008,
    lastUpdated: '2025-01',
  },
  'openai:o3-pro': {
    promptPricePer1K: 0.02,
    completionPricePer1K: 0.08,
  },
  'openai:o3-mini': {
    promptPricePer1K: 0.0011,
    completionPricePer1K: 0.0044,
  },
  'openai:o1-mini': {
    promptPricePer1K: 0.0011,
    completionPricePer1K: 0.0044,
  },
  'openai:o4-mini': {
    promptPricePer1K: 0.0011,
    completionPricePer1K: 0.0044,
  },

  // Anthropic (Claude) - Updated January 2025
  'anthropic:claude-opus-4.5': {
    promptPricePer1K: 0.005,
    completionPricePer1K: 0.025,
    lastUpdated: '2025-01',
  },
  'anthropic:claude-sonnet-4.5': {
    promptPricePer1K: 0.003,
    completionPricePer1K: 0.015,
    lastUpdated: '2025-01',
  },
  'anthropic:claude-3-5-haiku': {
    promptPricePer1K: 0.0008,
    completionPricePer1K: 0.004,
    lastUpdated: '2025-01',
  },
  'anthropic:claude-3-opus': {
    promptPricePer1K: 0.015,
    completionPricePer1K: 0.075,
  },
  'anthropic:claude-3-sonnet': {
    promptPricePer1K: 0.003,
    completionPricePer1K: 0.015,
  },
  'anthropic:claude-3.7-sonnet': {
    promptPricePer1K: 0.003,
    completionPricePer1K: 0.015,
  },
  'anthropic:claude-3-haiku': {
    promptPricePer1K: 0.00025,
    completionPricePer1K: 0.00125,
  },

  // Google Gemini - Updated January 2025
  'google:gemini-3-pro-preview': {
    promptPricePer1K: 0.002,
    completionPricePer1K: 0.012,
    lastUpdated: '2025-01',
  },
  'google:gemini-2.5-pro': {
    promptPricePer1K: 0.00125,
    completionPricePer1K: 0.01,
    lastUpdated: '2025-01',
  },
  'google:gemini-2.5-flash': {
    promptPricePer1K: 0.00015,
    completionPricePer1K: 0.0006,
    lastUpdated: '2025-01',
  },
  'google:gemini-pro': {
    promptPricePer1K: 0.00025,
    completionPricePer1K: 0.0005,
  },

  // Grok (X.AI)
  'grok:grok-4-0709': {
    promptPricePer1K: 0.003,
    completionPricePer1K: 0.015,
  },
  'grok:grok-3': {
    promptPricePer1K: 0.003,
    completionPricePer1K: 0.015,
  },
  'grok:grok-3-mini': {
    promptPricePer1K: 0.0003,
    completionPricePer1K: 0.0005,
  },

  // Mistral
  'mistral:mistral-large-3': {
    promptPricePer1K: 0.0005,
    completionPricePer1K: 0.0015,
  },
  'mistral:ministral-3': {
    promptPricePer1K: 0.0001,
    completionPricePer1K: 0.0003,
  },
  'mistral:codestral': {
    promptPricePer1K: 0.0002,
    completionPricePer1K: 0.0006,
  },
  'mistral:mistral-small-3': {
    promptPricePer1K: 0.0001,
    completionPricePer1K: 0.0003,
  },
  'mistral:open-mistral-7b': {
    promptPricePer1K: 0.00025,
    completionPricePer1K: 0.00025,
  },
  'mistral:mistral-medium': {
    promptPricePer1K: 0.00275,
    completionPricePer1K: 0.0081,
  },

  // Cohere
  'cohere:command-r': {
    promptPricePer1K: 0.0005,
    completionPricePer1K: 0.0015,
  },
  'cohere:command-r+': {
    promptPricePer1K: 0.003,
    completionPricePer1K: 0.015,
  },

  // Perplexity
  'perplexity:sonar': {
    promptPricePer1K: 0.001,
    completionPricePer1K: 0.001,
  },
  'perplexity:sonar-pro': {
    promptPricePer1K: 0.003,
    completionPricePer1K: 0.015,
  },
  'perplexity:sonar-reasoning': {
    promptPricePer1K: 0.001,
    completionPricePer1K: 0.005,
  },
  'perplexity:sonar-reasoning-pro': {
    promptPricePer1K: 0.002,
    completionPricePer1K: 0.008,
  },

  // Sarvam AI
  'sarvam:shivang': {
    promptPricePer1K: 0.0003,
    completionPricePer1K: 0.0008,
  },
};

/**
 * Get all available models for a provider
 */
export function getAvailableModels(provider: string): string[] {
  const normalizedProvider = provider.toLowerCase().trim();
  return Object.keys(modelPricing)
    .filter((key) => key.startsWith(`${normalizedProvider}:`))
    .map((key) => key.split(':')[1]);
}

/**
 * Get all supported providers
 */
export function getSupportedProviders(): string[] {
  const providers = new Set<string>();
  for (const key of Object.keys(modelPricing)) {
    providers.add(key.split(':')[0]);
  }
  return Array.from(providers);
}

/**
 * Add or update model pricing (useful for custom models)
 */
export function addModelPricing(
  provider: string,
  model: string,
  pricing: ModelPricing
): void {
  const key = `${provider.toLowerCase()}:${model.toLowerCase()}`;
  modelPricing[key] = pricing;
}
