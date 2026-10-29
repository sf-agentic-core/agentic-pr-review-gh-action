import type { getOctokit } from '@actions/github';
import type { QuorumDecision } from '../tally/tally.js';
import type { PreflightSummary } from '../invariants/index.js';

export interface MergeGateOptions {
  octokit: ReturnType<typeof getOctokit>;
  owner: string;
  repo: string;
  pullNumber: number;
  autoMergeRequested: boolean;
  preflight: PreflightSummary;
  decision: QuorumDecision;
  mergeMethod?: 'merge' | 'squash' | 'rebase';
}

export interface MergeGateResult {
  authorized: boolean;
  merged: boolean;
  commitSha?: string;
  reason?: string;
}

/**
 * Deterministic Merge Gate.
 * Validates that all invariants are satisfied before executing auto-merge:
 * 1. Pre-flight invariants must be 100% green (no secret leaks, no overlap drift, clean surfaces).
 * 2. Tribunal Quorum verdict must be strictly APPROVE with 0 blocking findings.
 * 3. Auto-merge must be explicitly enabled by user/workflow configuration.
 */
export async function evaluateMergeGate(options: MergeGateOptions): Promise<MergeGateResult> {
  const {
    octokit,
    owner,
    repo,
    pullNumber,
    autoMergeRequested,
    preflight,
    decision,
    mergeMethod = 'squash',
  } = options;

  // 1. Invariants check
  if (!preflight.success) {
    return {
      authorized: false,
      merged: false,
      reason: `Pre-flight invariants failed: ${preflight.reasons.join('; ')}`,
    };
  }

  // 2. Tribunal decision check
  if (decision.verdict !== 'APPROVE' || decision.blockers.length > 0) {
    return {
      authorized: false,
      merged: false,
      reason: `Tribunal verdict is ${decision.verdict} with ${decision.blockers.length} blocking finding(s).`,
    };
  }

  // 3. User opt-in check
  if (!autoMergeRequested) {
    return {
      authorized: true,
      merged: false,
      reason: 'PR approved by tribunal, but auto-merge not requested. Ready for manual merge.',
    };
  }

  // 4. Execute merge
  try {
    const response = await octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
      merge_method: mergeMethod,
    });

    return {
      authorized: true,
      merged: response.data.merged,
      commitSha: response.data.sha,
      reason: 'PR successfully merged by Agentic Review Tribunal auto-merge gate.',
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      authorized: true,
      merged: false,
      reason: `Auto-merge execution failed via GitHub API: ${errMsg}`,
    };
  }
}
