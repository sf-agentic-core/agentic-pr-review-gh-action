import type { getOctokit } from '@actions/github';
import type { QuorumDecision } from './tally.js';
import type { SeatReviewResult } from '../tribunal/types.js';
export interface ReviewPublisherOptions {
    octokit: ReturnType<typeof getOctokit>;
    owner: string;
    repo: string;
    pullNumber: number;
    commitSha: string;
    decision: QuorumDecision;
    seatResults: SeatReviewResult[];
}
/**
 * Publishes the aggregated tribunal review verdict and inline findings
 * to the specified GitHub Pull Request.
 */
export declare function publishPullRequestReview(options: ReviewPublisherOptions): Promise<number>;
