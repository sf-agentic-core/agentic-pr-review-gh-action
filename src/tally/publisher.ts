import type { getOctokit } from '@actions/github';
import type { QuorumDecision } from './tally.js';
import type { SeatReviewResult } from '../tribunal/types.js';
import {
  formatReviewBody,
  formatMajorComment,
  formatMinorComment,
  mapFindingsToInlineComments,
} from './formatter.js';

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
export async function publishPullRequestReview(
  options: ReviewPublisherOptions
): Promise<PublishResult> {
  const { octokit, owner, repo, pullNumber, commitSha, decision, seatResults } = options;

  const body = formatReviewBody(decision, seatResults);

  const importantFindings = decision.important ?? decision.blockers;
  const majorFindings = decision.major ?? decision.warnings;
  const minorFindings = decision.minor ?? decision.suggestions;

  // 1. Only Important/Blocker findings get mapped to inline diff comments
  const inlineComments = mapFindingsToInlineComments(importantFindings);

  const event = decision.verdict === 'APPROVE' ? 'APPROVE' : 'REQUEST_CHANGES';

  const reviewResponse = await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    commit_id: commitSha,
    body,
    event,
    comments: inlineComments.length > 0 ? inlineComments : undefined,
  });

  const reviewId = reviewResponse.data.id;
  let majorCommentId: number | undefined;
  let minorCommentId: number | undefined;

  // 2. Publish exactly one consolidated PR comment for Major suggestions
  if (majorFindings.length > 0) {
    const majorBody = formatMajorComment(majorFindings);
    if (majorBody) {
      const majorRes = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body: majorBody,
      });
      majorCommentId = majorRes.data.id;
    }
  }

  // 3. Publish exactly one consolidated PR comment for Minor suggestions
  if (minorFindings.length > 0) {
    const minorBody = formatMinorComment(minorFindings);
    if (minorBody) {
      const minorRes = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body: minorBody,
      });
      minorCommentId = minorRes.data.id;
    }
  }

  return {
    reviewId,
    majorCommentId,
    minorCommentId,
  };
}
