import { describe, it, expect, vi } from 'vitest';
import { publishPullRequestReview, type ReviewPublisherOptions } from './publisher.js';
import type { QuorumDecision } from './tally.js';
import type { SeatReviewResult } from '../tribunal/types.js';

describe('publishPullRequestReview', () => {
  const seats: SeatReviewResult[] = [
    {
      seatId: 'seat-a',
      seatName: 'Seat A',
      vote: 'APPROVE',
      summary: 'Clean',
      findings: [],
    },
  ];

  const decisionApproved: QuorumDecision = {
    verdict: 'APPROVE',
    approveVotes: 3,
    requestChangesVotes: 0,
    totalSeats: 3,
    blockers: [],
    warnings: [],
    suggestions: [],
    summary: 'Approved',
  };

  it('submits an APPROVE review via Octokit when verdict is APPROVE', async () => {
    const mockCreateReview = vi.fn(async () => ({ data: { id: 101 } }));

    const mockOctokit = {
      rest: {
        pulls: {
          createReview: mockCreateReview,
        },
      },
    } as any;

    const options: ReviewPublisherOptions = {
      octokit: mockOctokit,
      owner: 'sf-agentic-core',
      repo: 'agentic-pr-review-gh-action',
      pullNumber: 15,
      commitSha: 'sha-abcdef-123456',
      decision: decisionApproved,
      seatResults: seats,
    };

    const reviewId = await publishPullRequestReview(options);

    expect(reviewId).toBe(101);
    expect(mockCreateReview).toHaveBeenCalledTimes(1);
    const callArgs = (mockCreateReview as any).mock.calls[0]?.[0] as any;
    expect(callArgs.owner).toBe('sf-agentic-core');
    expect(callArgs.repo).toBe('agentic-pr-review-gh-action');
    expect(callArgs.pull_number).toBe(15);
    expect(callArgs.event).toBe('APPROVE');
    expect(callArgs.body).toContain('Synthetic Review Tribunal Verdict: `APPROVE`');
  });

  it('submits a REQUEST_CHANGES review with inline comments when blockers are present', async () => {
    const mockCreateReview = vi.fn(async () => ({ data: { id: 102 } }));

    const mockOctokit = {
      rest: {
        pulls: {
          createReview: mockCreateReview,
        },
      },
    } as any;

    const decisionRejected: QuorumDecision = {
      verdict: 'REQUEST_CHANGES',
      approveVotes: 2,
      requestChangesVotes: 1,
      totalSeats: 3,
      blockers: [
        {
          file: 'src/config.ts',
          line: 14,
          severity: 'BLOCKER',
          category: 'safety',
          title: 'Missing timeout',
          explanation: 'Will hang forever if unreachable',
        },
      ],
      warnings: [],
      suggestions: [],
      summary: 'Rejected',
    };

    const options: ReviewPublisherOptions = {
      octokit: mockOctokit,
      owner: 'sf-agentic-core',
      repo: 'agentic-pr-review-gh-action',
      pullNumber: 15,
      commitSha: 'sha-abcdef-123456',
      decision: decisionRejected,
      seatResults: seats,
    };

    const reviewId = await publishPullRequestReview(options);

    expect(reviewId).toBe(102);
    expect(mockCreateReview).toHaveBeenCalledTimes(1);
    const callArgs = (mockCreateReview as any).mock.calls[0]?.[0] as any;
    expect(callArgs.event).toBe('REQUEST_CHANGES');
    expect(callArgs.comments).toHaveLength(1);
    expect(callArgs.comments[0].path).toBe('src/config.ts');
    expect(callArgs.comments[0].line).toBe(14);
    expect(callArgs.comments[0].body).toContain('🚨 **[BLOCKER] Missing timeout**');
  });
});
