import { describe, it, expect } from 'vitest';
import { buildSeatPrompt, parseSeatOutput } from './prompts.js';
import type { PullRequestMetadata } from './types.js';

describe('buildSeatPrompt', () => {
  const samplePR: PullRequestMetadata = {
    title: 'feat: add user authentication',
    description: 'Implements login and session token generation',
    author: 'agent-worker',
    baseRef: 'main',
    headRef: 'feat/user-auth',
    diff: `diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,2 +10,4 @@
+export function login(user: string) {
+  return { token: "secret" };
+}`,
  };

  it('builds Seat A prompt focusing on correctness, state integrity and edge cases', () => {
    const { systemPrompt, userPrompt } = buildSeatPrompt('seat-a', samplePR);

    expect(systemPrompt).toContain('Seat A: Correctness, Algorithmic Integrity & Contracts');
    expect(systemPrompt).toContain('UNTRUSTED DATA BOUNDARY');
    expect(userPrompt).toContain('<untrusted_pr_title>');
    expect(userPrompt).toContain('feat: add user authentication');
    expect(userPrompt).toContain('<untrusted_diff>');
    expect(userPrompt).toContain('export function login');
  });

  it('builds Seat B prompt focusing on test boundaries and mutation resistance', () => {
    const { systemPrompt, userPrompt } = buildSeatPrompt('seat-b', samplePR);

    expect(systemPrompt).toContain('Seat B: Test Quality & Verification Boundaries');
    expect(userPrompt).toContain('<untrusted_diff>');
  });

  it('builds Seat C prompt focusing on KISS, premature abstraction and dead code', () => {
    const { systemPrompt, userPrompt } = buildSeatPrompt('seat-c', samplePR);

    expect(systemPrompt).toContain('Seat C: Cognitive Load & Radical Simplification');
    expect(userPrompt).toContain('<untrusted_diff>');
  });
});

describe('parseSeatOutput', () => {
  it('parses valid JSON response from LLM', () => {
    const rawLLMOutput = `
\`\`\`json
{
  "vote": "REQUEST_CHANGES",
  "summary": "Hardcoded secret token found",
  "findings": [
    {
      "file": "src/auth.ts",
      "line": 12,
      "severity": "BLOCKER",
      "category": "security",
      "title": "Hardcoded Secret",
      "explanation": "Token is hardcoded instead of dynamically generated.",
      "suggestion": "Use crypto.randomUUID()"
    }
  ]
}
\`\`\`
`;

    const result = parseSeatOutput('seat-a', rawLLMOutput);

    expect(result.seatId).toBe('seat-a');
    expect(result.vote).toBe('REQUEST_CHANGES');
    expect(result.summary).toBe('Hardcoded secret token found');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('BLOCKER');
    expect(result.findings[0].file).toBe('src/auth.ts');
  });

  it('defaults to REQUEST_CHANGES if LLM returns invalid or unparseable JSON', () => {
    const malformedOutput = 'I think this code is okay but not sure.';
    const result = parseSeatOutput('seat-b', malformedOutput);

    expect(result.seatId).toBe('seat-b');
    expect(result.vote).toBe('REQUEST_CHANGES');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('BLOCKER');
    expect(result.findings[0].title).toBe('Unparseable Tribunal Response');
  });
});
