import type { LLMRequestOptions, LLMResponse } from './types.js';

/**
 * Universal multi-provider LLM adapter supporting Anthropic Messages API,
 * OpenAI Chat Completions, and DeepSeek (OpenAI-compatible) API.
 * Uses native Fetch without external heavyweight SDK dependencies.
 */
export async function callLLM(
  options: LLMRequestOptions,
  fetchFn: typeof fetch = fetch
): Promise<LLMResponse> {
  const { provider, apiKey, model, systemPrompt, userPrompt, maxTokens = 4096, temperature = 0.1 } = options;

  if (provider === 'anthropic') {
    return callAnthropic({ apiKey, model, systemPrompt, userPrompt, maxTokens, temperature }, fetchFn);
  }

  if (provider === 'openai' || provider === 'deepseek') {
    const baseUrl = provider === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com/v1';
    return callOpenAICompatible(
      { baseUrl, apiKey, model, systemPrompt, userPrompt, maxTokens, temperature, providerName: provider },
      fetchFn
    );
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}

async function callAnthropic(
  params: {
    apiKey: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
    temperature: number;
  },
  fetchFn: typeof fetch
): Promise<LLMResponse> {
  const response = await fetchFn('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API request failed with status ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as any;
  const textContent =
    data.content && Array.isArray(data.content)
      ? data.content.find((c: any) => c.type === 'text')?.text || ''
      : '';

  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;

  return {
    content: textContent,
    tokensUsed: inputTokens + outputTokens,
  };
}

async function callOpenAICompatible(
  params: {
    baseUrl: string;
    apiKey: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
    temperature: number;
    providerName: string;
  },
  fetchFn: typeof fetch
): Promise<LLMResponse> {
  const response = await fetchFn(`${params.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `${params.providerName} API request failed with status ${response.status}: ${errorBody}`
    );
  }

  const data = (await response.json()) as any;
  const textContent = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens;

  return {
    content: textContent,
    tokensUsed,
  };
}
