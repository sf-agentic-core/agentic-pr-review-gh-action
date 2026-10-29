import { describe, it, expect, vi } from 'vitest';
import { escalateToHuman, type EscalationOptions } from './escalation.js';

describe('escalateToHuman', () => {
  it('applies needs-human-intervention label and posts alert comment on PR', async () => {
    const mockAddLabels = vi.fn(async () => ({}));
    const mockCreateComment = vi.fn(async () => ({}));

    const mockOctokit = {
      rest: {
        issues: {
          addLabels: mockAddLabels,
          createComment: mockCreateComment,
        },
      },
    } as any;

    const options: EscalationOptions = {
      octokit: mockOctokit,
      owner: 'sf-agentic-core',
      repo: 'agentic-pr-review-gh-action',
      pullNumber: 42,
      roundsUsed: 3,
      maxRounds: 3,
      lastBlockersCount: 2,
    };

    await escalateToHuman(options);

    expect(mockAddLabels).toHaveBeenCalledTimes(1);
    expect(mockAddLabels).toHaveBeenCalledWith({
      owner: 'sf-agentic-core',
      repo: 'agentic-pr-review-gh-action',
      issue_number: 42,
      labels: ['needs-human-intervention'],
    });

    expect(mockCreateComment).toHaveBeenCalledTimes(1);
    const commentBody = (mockCreateComment as any).mock.calls[0]?.[0]?.body;
    expect(commentBody).toContain('Tribunal Correction Budget Exhausted (3/3 rounds)');
    expect(commentBody).toContain('Autonomous retry loops have been halted');
  });
});
