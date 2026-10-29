import type { QuorumDecision } from './tally.js';
import type { SeatReviewResult, Finding } from '../tribunal/types.js';

export interface GitHubInlineComment {
  path: string;
  line: number;
  body: string;
}

/**
 * Formats the primary Markdown summary body for the GitHub PR review.
 */
export function formatReviewBody(
  decision: QuorumDecision,
  seatResults: SeatReviewResult[]
): string {
  const verdictEmoji = decision.verdict === 'APPROVE' ? '✅' : '❌';

  const rows = seatResults
    .map((seat) => {
      const voteEmoji = seat.vote === 'APPROVE' ? '✅' : '❌';
      return `| ${seat.seatName} | ${voteEmoji} ${seat.vote} | ${escapeMarkdown(seat.summary)} |`;
    })
    .join('\n');

  let body = `## 🏛️ Synthetic Review Tribunal Verdict: \`${decision.verdict}\`

> ${decision.summary}

### 🗳️ Tribunal Seat Votes

| Seat | Vote | Summary |
| --- | --- | --- |
${rows}
`;

  if (decision.blockers.length > 0) {
    body += `\n### 🚫 Blocking Findings (${decision.blockers.length})\n\n`;
    for (const b of decision.blockers) {
      const location = b.line ? `${b.file}:${b.line}` : b.file;
      body += `- **${escapeMarkdown(b.title)}** (\`${location}\`)\n`;
      body += `  > ${escapeMarkdown(b.explanation)}\n`;
      if (b.suggestion) {
        body += `  - **Suggestion:** ${escapeMarkdown(b.suggestion)}\n`;
      }
    }
  }

  if (decision.warnings.length > 0) {
    body += `\n### ⚠️ Warnings & Suggestions (${decision.warnings.length + decision.suggestions.length})\n\n`;
    for (const w of [...decision.warnings, ...decision.suggestions]) {
      const location = w.line ? `${w.file}:${w.line}` : w.file;
      body += `- [${w.severity}] **${escapeMarkdown(w.title)}** (\`${location}\`): ${escapeMarkdown(w.explanation)}\n`;
    }
  }

  body += '\n---\n*Generated deterministically by [Agentic PR Review Tribunal](https://github.com/sf-agentic-core/agentic-pr-review-gh-action)*';

  return body;
}

/**
 * Maps tribunal findings that contain file and line coordinates into GitHub inline diff comments.
 */
export function mapFindingsToInlineComments(findings: Finding[]): GitHubInlineComment[] {
  const inlineComments: GitHubInlineComment[] = [];

  for (const f of findings) {
    if (typeof f.line === 'number' && f.line > 0 && f.file !== 'unknown') {
      inlineComments.push({
        path: f.file,
        line: f.line,
        body: formatInlineComment(f),
      });
    }
  }

  return inlineComments;
}

export function formatInlineComment(finding: Finding): string {
  const icon = finding.severity === 'BLOCKER' ? '🚨' : finding.severity === 'WARNING' ? '⚠️' : '💡';
  let comment = `${icon} **[${finding.severity}] ${finding.title}**\n\n`;
  comment += `${finding.explanation}\n`;
  if (finding.suggestion) {
    comment += `\n> **Suggested Fix:**\n> ${finding.suggestion}\n`;
  }
  return comment;
}

function escapeMarkdown(text: string): string {
  return text.replace(/\|/g, '\\|');
}
