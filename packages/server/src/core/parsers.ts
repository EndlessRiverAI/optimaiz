/**
 * LLM Response Parsers
 *
 * Parse responses from different LLM providers into a unified format
 */

import type { MessageContent, ToolCall, ParsedResponse } from './types';
import { extractTokens } from './tokens';
import { estimateCost } from './cost';

/**
 * Parse raw LLM response based on provider
 */
export function parseResponse(
  rawResponse: any,
  provider: string,
  model: string
): ParsedResponse {
  const lowerProvider = provider.toLowerCase();
  const lowerModel = model.toLowerCase();

  try {
    // OpenAI
    if (
      lowerProvider.includes('openai') ||
      lowerModel.includes('gpt-5') ||
      lowerModel.includes('gpt-4') ||
      lowerModel.includes('o1') ||
      lowerModel.includes('o3')
    ) {
      return parseOpenAI(rawResponse, provider, model);
    }

    // Anthropic
    if (lowerProvider.includes('anthropic') || lowerModel.includes('claude')) {
      return parseAnthropic(rawResponse, provider, model);
    }

    // Google Gemini
    if (
      lowerProvider.includes('google') ||
      lowerModel.includes('gemini') ||
      lowerModel.includes('veo')
    ) {
      return parseGemini(rawResponse, provider, model);
    }

    // Mistral
    if (lowerProvider.includes('mistral')) {
      return parseMistral(rawResponse, provider, model);
    }

    // Perplexity
    if (lowerProvider.includes('perplexity')) {
      return parsePerplexity(rawResponse, provider, model);
    }

    // Cohere
    if (lowerProvider.includes('cohere')) {
      return parseCohere(rawResponse, provider, model);
    }

    // Fallback
    return parseFallback(rawResponse);
  } catch {
    return { responseText: '' };
  }
}

function parseOpenAI(raw: any, provider: string, model: string): ParsedResponse {
  // Handle SDK-wrapped responses
  let response = raw;
  if (raw.sdkHttpResponse?.body) {
    try {
      response =
        typeof raw.sdkHttpResponse.body === 'string'
          ? JSON.parse(raw.sdkHttpResponse.body)
          : raw.sdkHttpResponse.body;
    } catch {
      response = raw;
    }
  }

  // Image generation response (DALL-E)
  if (response.data && Array.isArray(response.data) && !response.choices) {
    const responseContent: MessageContent[] = [];
    response.data.forEach((item: any) => {
      if (item.url) {
        responseContent.push({
          type: 'image',
          role: 'assistant',
          value: item.url,
          mimeType: 'image/png',
        });
      } else if (item.b64_json) {
        responseContent.push({
          type: 'image',
          role: 'assistant',
          value: `data:image/png;base64,${item.b64_json}`,
          mimeType: 'image/png',
        });
      }
    });

    const tokenUsage = extractTokens(response, provider);

    return {
      responseText: '',
      responseContent: responseContent.length > 0 ? responseContent : undefined,
      usage: tokenUsage
        ? {
            ...tokenUsage,
            cost: estimateCost({
              provider,
              model,
              promptTokens: tokenUsage.promptTokens,
              completionTokens: tokenUsage.completionTokens,
            }),
          }
        : undefined,
    };
  }

  // Audio response (TTS)
  if (response.audio_url || response.audio) {
    const responseContent: MessageContent[] = [
      {
        type: 'audio',
        role: 'assistant',
        value: response.audio_url || response.audio,
        mimeType: response.mime_type || 'audio/mpeg',
      },
    ];

    const tokenUsage = extractTokens(response, provider);

    return {
      responseText: '',
      responseContent,
      usage: tokenUsage
        ? {
            ...tokenUsage,
            cost: estimateCost({
              provider,
              model,
              promptTokens: tokenUsage.promptTokens,
              completionTokens: tokenUsage.completionTokens,
            }),
          }
        : undefined,
    };
  }

  // Standard chat completion
  const choice = response?.choices?.[0] || raw?.choices?.[0];
  const message = choice?.message;
  const tokenUsage = extractTokens(response, provider) || extractTokens(raw, provider);

  let toolCalls: ToolCall[] = [];

  // Modern tool calls
  if (message?.tool_calls) {
    toolCalls = message.tool_calls.map((tc: any) => ({
      id: tc.id,
      type: tc.type,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));
  }
  // Legacy function calls
  else if (message?.function_call) {
    toolCalls = [
      {
        id: `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'function',
        function: {
          name: message.function_call.name,
          arguments: message.function_call.arguments,
        },
        _convertedFromFunctionCall: true,
      },
    ];
  }

  // Extract multi-modal content
  const responseContent: MessageContent[] = [];
  let responseText = '';

  if (message?.content) {
    if (typeof message.content === 'string') {
      responseText = message.content;
    } else if (Array.isArray(message.content)) {
      for (const item of message.content) {
        if (item.type === 'text' && item.text) {
          responseText += (responseText ? ' ' : '') + item.text;
        } else if (item.type === 'image_url' && item.image_url?.url) {
          responseContent.push({
            type: 'image',
            role: 'assistant',
            value: item.image_url.url,
            mimeType: item.image_url.mime_type || 'image/png',
          });
        } else if (item.type === 'video_url' && item.video_url?.url) {
          responseContent.push({
            type: 'video',
            role: 'assistant',
            value: item.video_url.url,
            mimeType: item.video_url.mime_type || 'video/mp4',
          });
        } else if (item.type === 'audio_url' && item.audio_url?.url) {
          responseContent.push({
            type: 'audio',
            role: 'assistant',
            value: item.audio_url.url,
            mimeType: item.audio_url.mime_type || 'audio/mpeg',
          });
        }
      }
    }
  }

  return {
    responseText,
    responseContent: responseContent.length > 0 ? responseContent : undefined,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: tokenUsage
      ? {
          ...tokenUsage,
          cost: estimateCost({
            provider,
            model,
            promptTokens: tokenUsage.promptTokens,
            completionTokens: tokenUsage.completionTokens,
          }),
        }
      : undefined,
  };
}

function parseAnthropic(raw: any, provider: string, model: string): ParsedResponse {
  const content = raw?.content || raw?.completion || '';

  // Tool use
  const toolCalls = raw?.content
    ?.filter((item: any) => item.type === 'tool_use')
    ?.map((toolUse: any) => ({
      id: toolUse.id,
      type: 'function' as const,
      function: {
        name: toolUse.name,
        arguments: toolUse.input,
      },
    }));

  // Multi-modal content
  const responseContent: MessageContent[] = [];
  let responseText = '';

  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.type === 'text' && item.text) {
        responseText += (responseText ? ' ' : '') + item.text;
      } else if (item.type === 'image' && item.source) {
        if (item.source.type === 'url' && item.source.url) {
          responseContent.push({
            type: 'image',
            role: 'assistant',
            value: item.source.url,
            mimeType: item.source.media_type || 'image/png',
          });
        } else if (item.source.type === 'base64' && item.source.data) {
          responseContent.push({
            type: 'image',
            role: 'assistant',
            value: `data:${item.source.media_type || 'image/png'};base64,${item.source.data}`,
            mimeType: item.source.media_type || 'image/png',
          });
        }
      }
    }
  } else if (typeof content === 'string') {
    responseText = content;
  }

  const tokenUsage = extractTokens(raw, provider);

  return {
    responseText,
    responseContent: responseContent.length > 0 ? responseContent : undefined,
    toolCalls: toolCalls?.length > 0 ? toolCalls : undefined,
    usage: tokenUsage
      ? {
          ...tokenUsage,
          cost: estimateCost({
            provider,
            model,
            promptTokens: tokenUsage.promptTokens,
            completionTokens: tokenUsage.completionTokens,
          }),
        }
      : undefined,
  };
}

function parseGemini(raw: any, provider: string, model: string): ParsedResponse {
  const candidate = raw?.candidates?.[0];
  const responseContent: MessageContent[] = [];
  let responseText = '';

  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.text) {
        responseText += (responseText ? ' ' : '') + part.text;
      } else if (part.inline_data || part.inlineData) {
        const inlineData = part.inline_data || part.inlineData;
        const mimeType = inlineData.mime_type || inlineData.mimeType || 'image/png';
        const data = inlineData.data;

        if (mimeType.startsWith('image/')) {
          responseContent.push({
            type: 'image',
            role: 'assistant',
            value: `data:${mimeType};base64,${data}`,
            mimeType,
          });
        } else if (mimeType.startsWith('audio/')) {
          responseContent.push({
            type: 'audio',
            role: 'assistant',
            value: `data:${mimeType};base64,${data}`,
            mimeType,
          });
        } else if (mimeType.startsWith('video/')) {
          responseContent.push({
            type: 'video',
            role: 'assistant',
            value: `data:${mimeType};base64,${data}`,
            mimeType,
          });
        }
      } else if (part.file_data || part.fileData) {
        const fileData = part.file_data || part.fileData;
        const mimeType = fileData.mime_type || fileData.mimeType || 'image/png';
        const fileUri = fileData.file_uri || fileData.fileUri;

        if (mimeType.startsWith('image/')) {
          responseContent.push({
            type: 'image',
            role: 'assistant',
            value: fileUri,
            mimeType,
          });
        } else if (mimeType.startsWith('video/')) {
          responseContent.push({
            type: 'video',
            role: 'assistant',
            value: fileUri,
            mimeType,
          });
        }
      }
    }
  }

  // Veo video response
  if (raw.video?.video_uri) {
    responseContent.push({
      type: 'video',
      role: 'assistant',
      value: raw.video.video_uri,
      mimeType: 'video/mp4',
    });
  }

  const tokenUsage = extractTokens(raw, provider);

  return {
    responseText,
    responseContent: responseContent.length > 0 ? responseContent : undefined,
    usage: tokenUsage
      ? {
          ...tokenUsage,
          cost: estimateCost({
            provider,
            model,
            promptTokens: tokenUsage.promptTokens,
            completionTokens: tokenUsage.completionTokens,
          }),
        }
      : undefined,
  };
}

function parseMistral(raw: any, provider: string, model: string): ParsedResponse {
  const choice = raw?.choices?.[0];
  const message = choice?.message;

  const toolCalls = message?.tool_calls?.map((tc: any) => ({
    id: tc.id,
    type: tc.type,
    function: {
      name: tc.function.name,
      arguments: tc.function.arguments,
    },
  }));

  const tokenUsage = extractTokens(raw, provider);

  return {
    responseText: message?.content || '',
    toolCalls: toolCalls?.length > 0 ? toolCalls : undefined,
    usage: tokenUsage
      ? {
          ...tokenUsage,
          cost: estimateCost({
            provider,
            model,
            promptTokens: tokenUsage.promptTokens,
            completionTokens: tokenUsage.completionTokens,
          }),
        }
      : undefined,
  };
}

function parsePerplexity(raw: any, provider: string, model: string): ParsedResponse {
  const choice = raw?.choices?.[0];
  const message = choice?.message;

  const toolCalls = message?.tool_calls?.map((tc: any) => ({
    id: tc.id,
    type: tc.type,
    function: {
      name: tc.function.name,
      arguments: tc.function.arguments,
    },
  }));

  const tokenUsage = extractTokens(raw, provider);

  return {
    responseText: message?.content || '',
    toolCalls: toolCalls?.length > 0 ? toolCalls : undefined,
    usage: tokenUsage
      ? {
          ...tokenUsage,
          cost: estimateCost({
            provider,
            model,
            promptTokens: tokenUsage.promptTokens,
            completionTokens: tokenUsage.completionTokens,
          }),
        }
      : undefined,
  };
}

function parseCohere(raw: any, provider: string, model: string): ParsedResponse {
  const tokenUsage = extractTokens(raw, provider);

  return {
    responseText: raw?.generations?.[0]?.text || '',
    usage: tokenUsage
      ? {
          ...tokenUsage,
          cost: estimateCost({
            provider,
            model,
            promptTokens: tokenUsage.promptTokens,
            completionTokens: tokenUsage.completionTokens,
          }),
        }
      : undefined,
  };
}

function parseFallback(raw: any): ParsedResponse {
  const text =
    raw?.output?.text ||
    raw?.choices?.[0]?.text ||
    raw?.content ||
    (typeof raw === 'string' ? raw : JSON.stringify(raw));

  return { responseText: text };
}
