import { describe, it, expect, vi } from 'vitest';
import { runTribunal, type TribunalOptions } from './runner.js';
import type { LLMClientFn, PullRequestMetadata } from './types.js';

describe('runTribunal', () => {
  const samplePR: PullRequestMetadata = {
    title: 'fix(core): resolve race condition in lock acquiring',
    description: 'Use atomic compare-and-swap instead of boolean flag',
    author: 'agentic-bot',
    baseRef: 'main',
    headRef: 'fix/race-condition',
    diff: `diff --git a/src/lock.ts b/src/lock.ts
--- a/src/lock.ts
+++ b/src/lock.ts
@@ -5,2 +5,2 @@
-let locked = false;
+const lockAtomic = new Atomics();`,
  };

  it('runs all three seats concurrently and aggregates findings when all seats approve', async () => {
    const mockLLM: LLMClientFn = vi.fn(async (opts) => {
      return {
        content: `\`\`\`json
{
  "vote": "APPROVE",
  "summary": "${opts.systemPrompt.includes('Seat A') ? 'Logic is sound' : opts.systemPrompt.includes('Seat B') ? 'Tests are solid' : 'KISS verified'}",
  "findings": []
}
\`\`\``,
        tokensUsed: 100,
      };
    });

    const options: TribunalOptions = {
      pr: samplePR,
      provider: 'anthropic',
      apiKey: 'test-key',
      model: 'claude-3-5-sonnet-latest',
      llmClient: mockLLM,
    };

    const tribunalResult = await runTribunal(options);

    expect(mockLLM).toHaveBeenCalledTimes(3);
    expect(tribunalResult.seatResults).toHaveLength(3);
    expect(tribunalResult.seatResults.map((s) => s.seatId)).toEqual(['seat-a', 'seat-b', 'seat-c']);
    expect(tribunalResult.allBlockers).toEqual([]);
    expect(tribunalResult.hasBlockers).toBe(false);
    expect(tribunalResult.totalTokensUsed).toBe(300);
  });

  it('collects blocking findings when Seat A detects a logic flaw', async () => {
    const mockLLM: LLMClientFn = vi.fn(async (opts) => {
      if (opts.systemPrompt.includes('Seat A')) {
        return {
          content: `\`\`\`json
{
  "vote": "REQUEST_CHANGES",
  "summary": "Race condition still possible on error path",
  "findings": [
    {
      "file": "src/lock.ts",
      "line": 6,
      "severity": "BLOCKER",
      "category": "correctness",
      "title": "Unhandled error release",
      "explanation": "If throw occurs, lock is never released"
    }
  ]
}
\`\`\``,
          tokensUsed: 120,
        };
      }

      return {
        content: `\`\`\`json
{
  "vote": "APPROVE",
  "summary": "Looks good",
  "findings": []
}
\`\`\``,
        tokensUsed: 80,
      };
    });

    const options: TribunalOptions = {
      pr: samplePR,
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o',
      llmClient: mockLLM,
    };

    const tribunalResult = await runTribunal(options);

    expect(tribunalResult.hasBlockers).toBe(true);
    expect(tribunalResult.allBlockers).toHaveLength(1);
    expect(tribunalResult.allBlockers[0].file).toBe('src/lock.ts');
    expect(tribunalResult.allBlockers[0].severity).toBe('BLOCKER');
    expect(tribunalResult.seatResults.find((s) => s.seatId === 'seat-a')?.vote).toBe(
      'REQUEST_CHANGES'
    );
  });

  it('runs heterogeneous seats with different providers and models per seat', async () => {
    const mockLLM: LLMClientFn = vi.fn(async (opts) => {
      return {
        content: `\`\`\`json
{
  "vote": "APPROVE",
  "summary": "Reviewed by ${opts.provider} / ${opts.model}",
  "findings": []
}
\`\`\``,
        tokensUsed: 150,
      };
    });

    const options: TribunalOptions = {
      pr: samplePR,
      seatConfigs: {
        'seat-a': {
          provider: 'google',
          apiKey: 'gemini-key',
          model: 'gemini-2.5-flash',
        },
        'seat-b': {
          provider: 'deepseek',
          apiKey: 'deepseek-key',
          model: 'deepseek-reasoner',
        },
        'seat-c': {
          provider: 'anthropic',
          apiKey: 'claude-key',
          model: 'claude-haiku-4-5',
        },
      },
      llmClient: mockLLM,
    };

    const result = await runTribunal(options);

    expect(mockLLM).toHaveBeenCalledTimes(3);

    const calls = (mockLLM as any).mock.calls;
    const providers = calls.map((c: any) => c[0].provider);
    const models = calls.map((c: any) => c[0].model);

    expect(providers).toContain('google');
    expect(providers).toContain('deepseek');
    expect(providers).toContain('anthropic');

    expect(models).toContain('gemini-2.5-flash');
    expect(models).toContain('deepseek-reasoner');
    expect(models).toContain('claude-haiku-4-5');

    expect(result.seatResults).toHaveLength(3);
    expect(result.hasBlockers).toBe(false);
  });
});
