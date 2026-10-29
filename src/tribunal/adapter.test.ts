import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callLLM } from './adapter.js';

describe('callLLM', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls Anthropic Messages API with correct headers and body format', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '```json\n{"vote":"APPROVE"}\n```' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    })) as unknown as typeof fetch;

    const res = await callLLM(
      {
        provider: 'anthropic',
        apiKey: 'sk-ant-test-key',
        model: 'claude-3-5-sonnet-latest',
        systemPrompt: 'You are Seat A',
        userPrompt: 'Review this diff',
      },
      mockFetch
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = (mockFetch as any).mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe('sk-ant-test-key');
    expect(init.headers['anthropic-version']).toBe('2023-06-01');

    const body = JSON.parse(init.body);
    expect(body.model).toBe('claude-3-5-sonnet-latest');
    expect(body.system).toBe('You are Seat A');
    expect(body.messages[0].content).toBe('Review this diff');

    expect(res.content).toContain('{"vote":"APPROVE"}');
    expect(res.tokensUsed).toBe(150);
  });

  it('calls OpenAI Chat Completions API with correct schema', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '```json\n{"vote":"APPROVE"}\n```' } }],
        usage: { total_tokens: 200 },
      }),
    })) as unknown as typeof fetch;

    const res = await callLLM(
      {
        provider: 'openai',
        apiKey: 'sk-openai-test-key',
        model: 'gpt-4o',
        systemPrompt: 'You are Seat B',
        userPrompt: 'Review this diff',
      },
      mockFetch
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = (mockFetch as any).mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers['Authorization']).toBe('Bearer sk-openai-test-key');

    const body = JSON.parse(init.body);
    expect(body.model).toBe('gpt-4o');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toBe('You are Seat B');
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toBe('Review this diff');

    expect(res.content).toContain('{"vote":"APPROVE"}');
    expect(res.tokensUsed).toBe(200);
  });

  it('calls DeepSeek endpoint when provider is deepseek', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '```json\n{"vote":"APPROVE"}\n```' } }],
        usage: { total_tokens: 180 },
      }),
    })) as unknown as typeof fetch;

    const res = await callLLM(
      {
        provider: 'deepseek',
        apiKey: 'sk-deepseek-test-key',
        model: 'deepseek-chat',
        systemPrompt: 'You are Seat C',
        userPrompt: 'Review this diff',
      },
      mockFetch
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = (mockFetch as any).mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(init.headers['Authorization']).toBe('Bearer sk-deepseek-test-key');

    const body = JSON.parse(init.body);
    expect(body.model).toBe('deepseek-chat');
    expect(res.tokensUsed).toBe(180);
  });

  it('throws an error if API responds with non-200 status', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => 'Invalid API key',
    })) as unknown as typeof fetch;

    await expect(
      callLLM(
        {
          provider: 'anthropic',
          apiKey: 'bad-key',
          model: 'claude-3-5-sonnet-latest',
          systemPrompt: '',
          userPrompt: '',
        },
        mockFetch
      )
    ).rejects.toThrow('Anthropic API request failed with status 401: Invalid API key');
  });
});
