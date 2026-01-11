/**
 * Cost Estimator
 *
 * Calculate costs for LLM API calls based on token usage
 */

import { modelPricing, type ModelPricing } from './pricing';

/**
 * Normalize model name for pricing lookup
 */
function normalizeModelName(model: string): string {
  return model
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Normalize provider name and return possible variations
 */
function normalizeProvider(provider: string): string[] {
  const normalized = provider.toLowerCase().trim();

  const aliases: Record<string, string> = {
    gemini: 'google',
    claude: 'anthropic',
    gpt: 'openai',
  };

  const canonical = aliases[normalized] || normalized;

  if (canonical !== normalized) {
    return [normalized, canonical];
  }

  return [normalized];
}

/**
 * Find pricing for a model, trying multiple variations
 */
function findPricing(provider: string, model: string): ModelPricing | null {
  const normalizedModel = normalizeModelName(model);
  const providerVariations = normalizeProvider(provider);

  for (const normalizedProvider of providerVariations) {
    // Try exact match first
    const exactKey = `${normalizedProvider}:${normalizedModel}`;
    if (modelPricing[exactKey]) {
      return modelPricing[exactKey];
    }

    // Build variations
    const variations: string[] = [
      normalizedModel,
      normalizedModel.replace(/\./g, '-'),
      normalizedModel.replace(/-/g, '.'),
    ];

    // Handle preview suffixes
    if (normalizedModel.includes('-preview')) {
      variations.push(normalizedModel.replace(/-preview$/, ''));
      variations.push(normalizedModel.replace(/-image-preview$/, '-preview'));
      variations.push(normalizedModel.replace(/-image-preview$/, ''));
    }

    const uniqueVariations = [...new Set(variations)];

    for (const variation of uniqueVariations) {
      const key = `${normalizedProvider}:${variation}`;
      if (modelPricing[key]) {
        return modelPricing[key];
      }
    }
  }

  return null;
}

export interface EstimateCostParams {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Estimate cost for an LLM API call
 *
 * @returns Cost in USD, or undefined if pricing not found
 */
export function estimateCost({
  provider,
  model,
  promptTokens,
  completionTokens,
}: EstimateCostParams): number | undefined {
  if (!provider || !model) {
    return undefined;
  }

  if (typeof promptTokens !== 'number' || typeof completionTokens !== 'number') {
    return undefined;
  }

  if (promptTokens < 0 || completionTokens < 0) {
    return undefined;
  }

  if (promptTokens === 0 && completionTokens === 0) {
    return 0;
  }

  const pricing = findPricing(provider, model);
  if (!pricing) {
    return undefined;
  }

  try {
    const promptCost = (promptTokens / 1000) * pricing.promptPricePer1K;
    const completionCost = (completionTokens / 1000) * pricing.completionPricePer1K;
    const totalCost = promptCost + completionCost;

    return Number(totalCost.toFixed(6));
  } catch {
    return undefined;
  }
}

/**
 * Check if pricing exists for a model
 */
export function hasPricing(provider: string, model: string): boolean {
  return findPricing(provider, model) !== null;
}

/**
 * Get pricing for a model
 */
export function getPricing(provider: string, model: string): ModelPricing | null {
  return findPricing(provider, model);
}
