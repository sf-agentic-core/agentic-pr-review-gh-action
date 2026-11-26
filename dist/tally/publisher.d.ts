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
export interface PublishResult {
    reviewId: number;
    majorCommentId?: number;
    minorCommentId?: number;
}
/**
 * Publishes the aggregated tribunal review verdict and inline findings
 * following the 3-tier review ergonomics:
 * 1. Main PR review carrying the verdict matrix and inline comments for IMPORTANT findings.
 * 2. Exactly one PR comment for all MAJOR findings (if any).
 * 3. Exactly one separate PR comment for all MINOR findings (if any).
 */
export declare function publishPullRequestReview(options: ReviewPublisherOptions): Promise<PublishResult>;
