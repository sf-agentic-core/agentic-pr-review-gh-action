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
  const rawWarnings: Finding[] = [];
  const rawSuggestions: Finding[] = [];

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
        rawWarnings.push(finding);
      } else {
        rawSuggestions.push(finding);
      }
    }
  }

  // Deduplicate blockers, warnings, and suggestions by file + line proximity + semantic overlap
  const blockers = deduplicateFindings(rawBlockers);
  const warnings = deduplicateFindings(rawWarnings);
  const suggestions = deduplicateFindings(rawSuggestions);

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

export function deduplicateFindings(findings: Finding[]): Finding[] {
  const deduped: Finding[] = [];

  for (const candidate of findings) {
    const isDuplicate = deduped.some((existing) => {
      // 1. Same file required
      if (existing.file !== candidate.file) return false;

      // 2. Exact match on title and line
      if (
        existing.line === candidate.line &&
        existing.title.toLowerCase().trim() === candidate.title.toLowerCase().trim()
      ) {
        return true;
      }

      // 3. Proximity match: both have lines, lines within 5 of each other, and similar category or keywords
      if (
        typeof existing.line === 'number' &&
        typeof candidate.line === 'number' &&
        Math.abs(existing.line - candidate.line) <= 5
      ) {
        // If category matches, or if either title shares significant words
        const wordsA = new Set(existing.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
        const wordsB = candidate.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
        const sharedWords = wordsB.filter((w) => wordsA.has(w));

        if (existing.category === candidate.category || sharedWords.length > 0) {
          return true;
        }
      }

      return false;
    });

    if (!isDuplicate) {
      deduped.push(candidate);
    }
  }

  return deduped;
}
