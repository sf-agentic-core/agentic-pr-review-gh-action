import type { getOctokit } from '@actions/github';
import type { QuorumDecision } from './tally.js';
import type { SeatReviewResult } from '../tribunal/types.js';
import { formatReviewBody, mapFindingsToInlineComments } from './formatter.js';

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
export async function publishPullRequestReview(
  options: ReviewPublisherOptions
): Promise<number> {
  const { octokit, owner, repo, pullNumber, commitSha, decision, seatResults } = options;

  const body = formatReviewBody(decision, seatResults);

  const allFindings = [...decision.blockers, ...decision.warnings, ...decision.suggestions];
  const inlineComments = mapFindingsToInlineComments(allFindings);

  const event = decision.verdict === 'APPROVE' ? 'APPROVE' : 'REQUEST_CHANGES';

  const response = await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    commit_id: commitSha,
    body,
    event,
    comments: inlineComments.length > 0 ? inlineComments : undefined,
  });

  return response.data.id;
}
