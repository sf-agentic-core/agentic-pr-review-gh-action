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

    const publishResult = await publishPullRequestReview(options);

    expect(publishResult.reviewId).toBe(101);
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

    const publishResult = await publishPullRequestReview(options);

    expect(publishResult.reviewId).toBe(102);
    expect(mockCreateReview).toHaveBeenCalledTimes(1);
    const callArgs = (mockCreateReview as any).mock.calls[0]?.[0] as any;
    expect(callArgs.event).toBe('REQUEST_CHANGES');
    expect(callArgs.comments).toHaveLength(1);
    expect(callArgs.comments[0].path).toBe('src/config.ts');
    expect(callArgs.comments[0].line).toBe(14);
    expect(callArgs.comments[0].body).toContain('**Important — must be fixed before approval**');
    expect(callArgs.comments[0].body).toContain('Will hang forever if unreachable');
  });

  it('posts consolidated Major and Minor comments when present', async () => {
    const mockCreateReview = vi.fn(async () => ({ data: { id: 103 } }));
    const mockCreateComment = vi
      .fn()
      .mockImplementationOnce(async () => ({ data: { id: 201 } }))
      .mockImplementationOnce(async () => ({ data: { id: 202 } }));

    const mockOctokit = {
      rest: {
        pulls: {
          createReview: mockCreateReview,
        },
        issues: {
          createComment: mockCreateComment,
        },
      },
    } as any;

    const decisionWithAllTiers: QuorumDecision = {
      verdict: 'REQUEST_CHANGES',
      approveVotes: 2,
      requestChangesVotes: 1,
      totalSeats: 3,
      blockers: [
        {
          file: 'src/main.ts',
          line: 5,
          severity: 'IMPORTANT',
          category: 'correctness',
          title: 'Null pointer dereference',
          explanation: 'Object can be null',
        },
      ],
      warnings: [
        {
          file: 'src/utils.ts',
          line: 20,
          severity: 'MAJOR',
          category: 'simplicity',
          title: 'Overengineered factory',
          explanation: 'Use simple function instead',
          suggestion: 'export function parse()',
        },
      ],
      suggestions: [
        {
          file: 'src/types.ts',
          line: 12,
          severity: 'MINOR',
          category: 'style',
          title: 'Nitpick in type name',
          explanation: 'Consider PascalCase',
        },
      ],
      important: [],
      major: [],
      minor: [],
      summary: 'Needs fixes',
    };
    decisionWithAllTiers.important = decisionWithAllTiers.blockers;
    decisionWithAllTiers.major = decisionWithAllTiers.warnings;
    decisionWithAllTiers.minor = decisionWithAllTiers.suggestions;

    const options: ReviewPublisherOptions = {
      octokit: mockOctokit,
      owner: 'sf-agentic-core',
      repo: 'agentic-pr-review-gh-action',
      pullNumber: 20,
      commitSha: 'sha-789012',
      decision: decisionWithAllTiers,
      seatResults: seats,
    };

    const result = await publishPullRequestReview(options);

    expect(result.reviewId).toBe(103);
    expect(result.majorCommentId).toBe(201);
    expect(result.minorCommentId).toBe(202);

    expect(mockCreateReview).toHaveBeenCalledTimes(1);
    expect(mockCreateComment).toHaveBeenCalledTimes(2);

    const majorArgs = mockCreateComment.mock.calls[0]?.[0];
    expect(majorArgs.body).toContain('## 💡 Major suggestions (non-blocking, 1 items)');
    expect(majorArgs.body).toContain('Overengineered factory');

    const minorArgs = mockCreateComment.mock.calls[1]?.[0];
    expect(minorArgs.body).toContain('## 🔍 Minor suggestions (optional, 1 items)');
    expect(minorArgs.body).toContain('Nitpick in type name');
  });
});
