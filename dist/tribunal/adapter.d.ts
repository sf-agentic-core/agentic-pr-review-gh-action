import type { LLMRequestOptions, LLMResponse } from './types.js';
/**
 * Universal multi-provider LLM adapter supporting Anthropic Messages API,
 * OpenAI Chat Completions, and DeepSeek (OpenAI-compatible) API.
 * Uses native Fetch without external heavyweight SDK dependencies.
 */
export declare function callLLM(options: LLMRequestOptions, fetchFn?: typeof fetch): Promise<LLMResponse>;
