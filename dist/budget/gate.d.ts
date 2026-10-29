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
export declare function evaluateMergeGate(options: MergeGateOptions): Promise<MergeGateResult>;
