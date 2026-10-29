import type { SeatReviewResult, Finding } from '../tribunal/types.js';

export interface QuorumDecision {
  verdict: 'APPROVE' | 'REQUEST_CHANGES';
  approveVotes: number;
  requestChangesVotes: number;
  totalSeats: number;
  blockers: Finding[];
  warnings: Finding[];
  suggestions: Finding[];
  summary: string;
}

/**
 * Calculates the final tribunal decision based on the Principle of Asymmetric Quorum:
 * - APPROVE requires at least 2 approving seats AND 0 blocking findings.
 * - REQUEST_CHANGES triggers if even a SINGLE seat raises 1 or more blocking findings.
 */
export function calculateQuorum(seatResults: SeatReviewResult[]): QuorumDecision {
  const totalSeats = seatResults.length;
  let approveVotes = 0;
  let requestChangesVotes = 0;

  const rawBlockers: Finding[] = [];
  const warnings: Finding[] = [];
  const suggestions: Finding[] = [];

  for (const seat of seatResults) {
    if (seat.vote === 'APPROVE') {
      approveVotes++;
    } else {
      requestChangesVotes++;
    }

    for (const finding of seat.findings) {
      if (finding.severity === 'BLOCKER') {
        rawBlockers.push(finding);
      } else if (finding.severity === 'WARNING') {
        warnings.push(finding);
      } else {
        suggestions.push(finding);
      }
    }
  }

  // Deduplicate blockers by file + line + title
  const blockers = deduplicateFindings(rawBlockers);

  const hasBlockers = blockers.length > 0;
  const isApproved = !hasBlockers && approveVotes >= Math.ceil(totalSeats / 2);

  let summary = '';
  if (isApproved) {
    if (approveVotes === totalSeats) {
      summary = `Unanimous approval (${approveVotes}-0) with zero blocking findings across all seats.`;
    } else {
      summary = `Approved by majority (${approveVotes}/${totalSeats}) with zero blocking findings.`;
    }
  } else {
    if (hasBlockers) {
      summary = `Asymmetric Quorum: ${requestChangesVotes} seat(s) raised blocking findings (${blockers.length} unique blocker(s)). Changes requested.`;
    } else {
      summary = `Quorum not reached: only ${approveVotes}/${totalSeats} seats approved. Changes requested.`;
    }
  }

  return {
    verdict: isApproved ? 'APPROVE' : 'REQUEST_CHANGES',
    approveVotes,
    requestChangesVotes,
    totalSeats,
    blockers,
    warnings,
    suggestions,
    summary,
  };
}

function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const deduped: Finding[] = [];

  for (const f of findings) {
    const key = `${f.file}:${f.line ?? 'any'}:${f.title.toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(f);
    }
  }

  return deduped;
}
