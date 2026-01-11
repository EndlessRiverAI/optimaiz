/**
 * Token Extraction Utilities
 *
 * Standardizes token counts from different LLM providers
 */

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Extract tokens from OpenAI response
 */
export function extractOpenAITokens(rawResponse: any): TokenUsage | null {
  try {
    const usage = rawResponse?.usage || rawResponse?.sdkHttpResponse?.body?.usage;

    if (!usage) {
      return null;
    }

    const promptTokens = Number(usage.prompt_tokens) || 0;
    const completionTokens = Number(usage.completion_tokens) || 0;
    const totalTokens = Number(usage.total_tokens) || promptTokens + completionTokens;

    if (promptTokens < 0 || completionTokens < 0 || totalTokens < 0) {
      return null;
    }

    return { promptTokens, completionTokens, totalTokens };
  } catch {
    return null;
  }
}

/**
 * Extract tokens from Anthropic response
 */
export function extractAnthropicTokens(rawResponse: any): TokenUsage | null {
  try {
    const usage = rawResponse?.usage;

    if (!usage) {
      return null;
    }

    const promptTokens = Number(usage.input_tokens) || 0;
    const completionTokens = Number(usage.output_tokens) || 0;
    const totalTokens = promptTokens + completionTokens;

    if (promptTokens < 0 || completionTokens < 0) {
      return null;
    }

    return { promptTokens, completionTokens, totalTokens };
  } catch {
    return null;
  }
}

/**
 * Extract tokens from Google Gemini response
 */
export function extractGeminiTokens(rawResponse: any): TokenUsage | null {
  try {
    const usageMeta = rawResponse?.usageMetadata;

    if (!usageMeta) {
      return null;
    }

    const promptTokens = Number(usageMeta.promptTokenCount) || 0;
    const completionTokens = Number(usageMeta.candidatesTokenCount) || 0;
    let totalTokens = promptTokens + completionTokens;

    if (promptTokens < 0 || completionTokens < 0) {
      return null;
    }

    // Use provided total if available
    if (usageMeta.totalTokenCount !== undefined) {
      const providedTotal = Number(usageMeta.totalTokenCount) || 0;
      if (providedTotal > 0) {
        totalTokens = providedTotal;
      }
    }

    return { promptTokens, completionTokens, totalTokens };
  } catch {
    return null;
  }
}

/**
 * Extract tokens from Perplexity response
 */
export function extractPerplexityTokens(rawResponse: any): TokenUsage | null {
  return extractOpenAITokens(rawResponse); // Same format as OpenAI
}

/**
 * Extract tokens from Mistral response
 */
export function extractMistralTokens(rawResponse: any): TokenUsage | null {
  return extractOpenAITokens(rawResponse); // Same format as OpenAI
}

/**
 * Extract tokens from Cohere response
 */
export function extractCohereTokens(rawResponse: any): TokenUsage | null {
  try {
    const usage = rawResponse?.meta?.billed_units;

    if (!usage) {
      return null;
    }

    const promptTokens = Number(usage.input_tokens) || 0;
    const completionTokens = Number(usage.output_tokens) || 0;
    const totalTokens = promptTokens + completionTokens;

    if (promptTokens < 0 || completionTokens < 0) {
      return null;
    }

    return { promptTokens, completionTokens, totalTokens };
  } catch {
    return null;
  }
}

/**
 * Universal token extractor - tries all provider formats
 */
export function extractTokensUniversal(rawResponse: any): TokenUsage | null {
  // Try OpenAI format first (most common)
  let tokens = extractOpenAITokens(rawResponse);
  if (tokens) return tokens;

  // Try Anthropic format
  tokens = extractAnthropicTokens(rawResponse);
  if (tokens) return tokens;

  // Try Gemini format
  tokens = extractGeminiTokens(rawResponse);
  if (tokens) return tokens;

  // Try Cohere format
  tokens = extractCohereTokens(rawResponse);
  if (tokens) return tokens;

  return null;
}

/**
 * Main token extraction function - routes to provider-specific extractor
 */
export function extractTokens(rawResponse: any, provider: string): TokenUsage | null {
  const lowerProvider = provider.toLowerCase();

  if (lowerProvider.includes('openai')) {
    return extractOpenAITokens(rawResponse);
  }

  if (lowerProvider.includes('anthropic') || lowerProvider.includes('claude')) {
    return extractAnthropicTokens(rawResponse);
  }

  if (lowerProvider.includes('google') || lowerProvider.includes('gemini')) {
    return extractGeminiTokens(rawResponse);
  }

  if (lowerProvider.includes('perplexity')) {
    return extractPerplexityTokens(rawResponse);
  }

  if (lowerProvider.includes('mistral')) {
    return extractMistralTokens(rawResponse);
  }

  if (lowerProvider.includes('cohere')) {
    return extractCohereTokens(rawResponse);
  }

  // Fallback to universal extractor
  return extractTokensUniversal(rawResponse);
}
