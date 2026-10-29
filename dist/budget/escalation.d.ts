import type { getOctokit } from '@actions/github';
export interface EscalationOptions {
    octokit: ReturnType<typeof getOctokit>;
    owner: string;
    repo: string;
    pullNumber: number;
    roundsUsed: number;
    maxRounds: number;
    lastBlockersCount: number;
}
/**
 * Flags the PR for human intervention when the automated correction budget has been exhausted.
 * Applies the `needs-human-intervention` label and posts an explanatory comment.
 */
export declare function escalateToHuman(options: EscalationOptions): Promise<void>;
