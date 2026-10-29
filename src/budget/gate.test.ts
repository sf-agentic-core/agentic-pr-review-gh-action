import { describe, it, expect, vi } from 'vitest';
import { evaluateMergeGate, type MergeGateOptions } from './gate.js';
import type { QuorumDecision } from '../tally/tally.js';
import type { PreflightSummary } from '../invariants/index.js';

describe('evaluateMergeGate', () => {
  const cleanPreflight: PreflightSummary = {
    success: true,
    reasons: [],
    surfacesResult: { isValid: true, violations: [] },
  };

  const cleanDecision: QuorumDecision = {
    verdict: 'APPROVE',
    approveVotes: 3,
    requestChangesVotes: 0,
    totalSeats: 3,
    blockers: [],
    warnings: [],
    suggestions: [],
    summary: 'Approved',
  };

  it('authorizes merge when preflight passed, tribunal approved, and auto-merge is requested', async () => {
    const mockMerge = vi.fn(async () => ({ data: { merged: true, sha: 'final-sha-123' } }));

    const mockOctokit = {
      rest: {
        pulls: {
          merge: mockMerge,
        },
      },
    } as any;

    const options: MergeGateOptions = {
      octokit: mockOctokit,
      owner: 'sf-agentic-core',
      repo: 'agentic-pr-review-gh-action',
      pullNumber: 10,
      autoMergeRequested: true,
      preflight: cleanPreflight,
      decision: cleanDecision,
      mergeMethod: 'squash',
    };

    const result = await evaluateMergeGate(options);

    expect(result.authorized).toBe(true);
    expect(result.merged).toBe(true);
    expect(result.commitSha).toBe('final-sha-123');
    expect(mockMerge).toHaveBeenCalledWith({
      owner: 'sf-agentic-core',
      repo: 'agentic-pr-review-gh-action',
      pull_number: 10,
      merge_method: 'squash',
    });
  });

  it('refuses merge if preflight invariants failed', async () => {
    const mockMerge = vi.fn();
    const mockOctokit = { rest: { pulls: { merge: mockMerge } } } as any;

    const failedPreflight: PreflightSummary = {
      success: false,
      reasons: ['Secret detected'],
      surfacesResult: { isValid: false, violations: [] },
    };

    const options: MergeGateOptions = {
      octokit: mockOctokit,
      owner: 'sf-agentic-core',
      repo: 'agentic-pr-review-gh-action',
      pullNumber: 10,
      autoMergeRequested: true,
      preflight: failedPreflight,
      decision: cleanDecision,
    };

    const result = await evaluateMergeGate(options);

    expect(result.authorized).toBe(false);
    expect(result.merged).toBe(false);
    expect(result.reason).toContain('Pre-flight invariants failed');
    expect(mockMerge).not.toHaveBeenCalled();
  });

  it('refuses merge if tribunal requested changes', async () => {
    const mockMerge = vi.fn();
    const mockOctokit = { rest: { pulls: { merge: mockMerge } } } as any;

    const rejectedDecision: QuorumDecision = {
      ...cleanDecision,
      verdict: 'REQUEST_CHANGES',
      blockers: [{ file: 'src/a.ts', severity: 'BLOCKER', category: 'c', title: 't', explanation: 'e' }],
    };

    const options: MergeGateOptions = {
      octokit: mockOctokit,
      owner: 'sf-agentic-core',
      repo: 'agentic-pr-review-gh-action',
      pullNumber: 10,
      autoMergeRequested: true,
      preflight: cleanPreflight,
      decision: rejectedDecision,
    };

    const result = await evaluateMergeGate(options);

    expect(result.authorized).toBe(false);
    expect(result.merged).toBe(false);
    expect(result.reason).toContain('Tribunal verdict is REQUEST_CHANGES');
    expect(mockMerge).not.toHaveBeenCalled();
  });

  it('skips merge if autoMergeRequested is false even when all checks pass', async () => {
    const mockMerge = vi.fn();
    const mockOctokit = { rest: { pulls: { merge: mockMerge } } } as any;

    const options: MergeGateOptions = {
      octokit: mockOctokit,
      owner: 'sf-agentic-core',
      repo: 'agentic-pr-review-gh-action',
      pullNumber: 10,
      autoMergeRequested: false,
      preflight: cleanPreflight,
      decision: cleanDecision,
    };

    const result = await evaluateMergeGate(options);

    expect(result.authorized).toBe(true);
    expect(result.merged).toBe(false);
    expect(result.reason).toContain('auto-merge not requested');
    expect(mockMerge).not.toHaveBeenCalled();
  });
});
