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
export async function escalateToHuman(options: EscalationOptions): Promise<void> {
  const { octokit, owner, repo, pullNumber, roundsUsed, maxRounds, lastBlockersCount } = options;

  // 1. Add label
  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: pullNumber,
    labels: ['needs-human-intervention'],
  });

  // 2. Post explanatory comment
  const comment = `## 🚨 Tribunal Correction Budget Exhausted (${roundsUsed}/${maxRounds} rounds)

This pull request has exhausted the allowed automated correction iterations.
- **Unresolved Blocking Findings:** ${lastBlockersCount}
- **Status:** Autonomous retry loops have been halted to prevent model hallucination or churn.
- **Action Required:** A human engineer must inspect the remaining findings and manually steer or merge this change.

---
*Escalated automatically by [Agentic PR Review Tribunal](https://github.com/sf-agentic-core/agentic-pr-review-gh-action)*`;

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body: comment,
  });
}
