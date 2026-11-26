import type { QuorumDecision } from './tally.js';
import type { SeatReviewResult, Finding } from '../tribunal/types.js';

export interface GitHubInlineComment {
  path: string;
  line: number;
  body: string;
}

/**
 * Formats the primary Markdown summary body for the GitHub PR review.
 * Contains the executive verdict, asymmetric quorum explanation, and the 3-seat voting matrix.
 */
export function formatReviewBody(
  decision: QuorumDecision,
  seatResults: SeatReviewResult[]
): string {
  const rows = seatResults
    .map((seat) => {
      const voteEmoji = seat.vote === 'APPROVE' ? '✅' : '❌';
      return `| ${seat.seatName} | ${voteEmoji} **${seat.vote}** | ${escapeMarkdown(seat.summary)} |`;
    })
    .join('\n');

  let body = `## 🏛️ Synthetic Review Tribunal Verdict: \`${decision.verdict}\`

> ${decision.summary}

### 🗳️ Tribunal Seat Votes

| Seat | Vote | Summary |
| --- | :---: | --- |
${rows}
`;

  const importantList = decision.important ?? decision.blockers;
  const majorList = decision.major ?? decision.warnings;
  const minorList = decision.minor ?? decision.suggestions;

  if (importantList.length > 0) {
    body += `\n### 🚨 Important Findings (${importantList.length})\n\n`;
    body += `> These findings are blocking and must be resolved before approval. Each item has an inline discussion thread on the modified line.\n\n`;
    for (const b of importantList) {
      const location = b.line ? `${b.file}:${b.line}` : b.file;
      body += `- **${escapeMarkdown(b.title)}** (\`${location}\`)\n`;
      body += `  > ${escapeMarkdown(b.explanation)}\n`;
      if (b.suggestion) {
        body += `  - **Suggested Fix:** ${escapeMarkdown(b.suggestion)}\n`;
      }
    }
  }

  body += '\n### 📋 Review Ergonomics Summary\n';
  body += `- **Important (Blocking):** ${importantList.length} finding(s) — mapped to inline diff comments.\n`;
  body += `- **Major (Non-blocking):** ${majorList.length} suggestion(s) — grouped into a single consolidated PR comment.\n`;
  body += `- **Minor (Optional):** ${minorList.length} item(s) — grouped into a single separate PR comment.\n`;

  body += '\n---\n*Generated deterministically by [Agentic PR Review Tribunal](https://github.com/sf-agentic-core/agentic-pr-review-gh-action) with 3-tier review ergonomics.*';

  return body;
}

/**
 * Formats exactly ONE consolidated comment for all Major suggestions.
 */
export function formatMajorComment(majors: Finding[]): string {
  if (majors.length === 0) return '';

  let body = `## 💡 Major suggestions (non-blocking, ${majors.length} items)\n\n`;
  body += `These improve the PR substantially but are not required for approval.\n`;
  body += `Resolving or dismissing this single comment covers all of them.\n\n`;

  majors.forEach((m, idx) => {
    const loc = m.line ? `${m.file}:${m.line}` : m.file;
    const cat = m.category ? `[${m.category}] ` : '';
    body += `${idx + 1}. \`${loc}\` — **${cat}${escapeMarkdown(m.title)}**: ${escapeMarkdown(m.explanation)}`;
    if (m.suggestion) {
      body += ` → *Suggested change:* ${escapeMarkdown(m.suggestion)}`;
    }
    body += '\n';
  });

  return body;
}

/**
 * Formats exactly ONE consolidated comment for all Minor suggestions.
 */
export function formatMinorComment(minors: Finding[]): string {
  if (minors.length === 0) return '';

  let body = `## 🔍 Minor suggestions (optional, ${minors.length} items)\n\n`;
  body += `Nice to have; ignore safely if time is short.\n`;
  body += `Dismissing this comment is a complete answer.\n\n`;

  minors.forEach((m, idx) => {
    const loc = m.line ? `${m.file}:${m.line}` : m.file;
    const cat = m.category ? `[${m.category}] ` : '';
    const desc = m.explanation ? `${m.title}: ${m.explanation}` : m.title;
    body += `${idx + 1}. \`${loc}\` — ${cat}${escapeMarkdown(desc)}`;
    if (m.suggestion) {
      body += ` → *Suggestion:* ${escapeMarkdown(m.suggestion)}`;
    }
    body += '\n';
  });

  return body;
}

/**
 * Maps Important/Blocker tribunal findings into GitHub inline diff comments.
 * Non-blocking findings (Major/Minor) are excluded here to prevent diff noise.
 */
export function mapFindingsToInlineComments(findings: Finding[]): GitHubInlineComment[] {
  const inlineComments: GitHubInlineComment[] = [];

  for (const f of findings) {
    const isImportant = f.severity === 'IMPORTANT' || f.severity === 'BLOCKER';
    if (isImportant && typeof f.line === 'number' && f.line > 0 && f.file !== 'unknown') {
      inlineComments.push({
        path: f.file,
        line: f.line,
        body: formatInlineComment(f),
      });
    }
  }

  return inlineComments;
}

/**
 * Formats a single Important finding using the strict peer-pr-review inline template:
 * **Important — must be fixed before approval**
 * <one sentence: what breaks, for whom, under which input or state>
 * <fenced quote of the current code, 1-4 lines>
 * Suggested fix: <concrete change, code snippet when shorter than prose>
 */
export function formatInlineComment(finding: Finding): string {
  let comment = `**Important — must be fixed before approval**\n\n`;
  comment += `${finding.explanation || finding.title}\n`;

  if (finding.quotedCode) {
    comment += `\n\`\`\`\n${finding.quotedCode.trim()}\n\`\`\`\n`;
  }

  if (finding.suggestion) {
    comment += `\nSuggested fix: ${finding.suggestion}\n`;
  }

  return comment;
}

function escapeMarkdown(text: string): string {
  return text.replace(/\|/g, '\\|');
}
