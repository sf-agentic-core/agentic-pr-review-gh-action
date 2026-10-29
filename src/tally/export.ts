import * as fs from 'node:fs';
import * as path from 'node:path';
import type { QuorumDecision } from './tally.js';
import type { SeatReviewResult } from '../tribunal/types.js';
import { formatReviewBody } from './formatter.js';

export interface ArtifactExportOptions {
  outputDir?: string;
  decision: QuorumDecision;
  seatResults: SeatReviewResult[];
}

export interface ArtifactExportResult {
  markdownPath: string;
  jsonPath: string;
}

/**
 * Persists the tribunal verdict and review report to local disk files:
 * - `.tribunal/review.md`: Complete human and agent-readable Markdown report
 * - `.tribunal/verdict.json`: Machine-readable structured decision payload
 */
export async function exportTribunalArtifacts(
  options: ArtifactExportOptions
): Promise<ArtifactExportResult> {
  const { outputDir = '.tribunal', decision, seatResults } = options;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const markdownPath = path.join(outputDir, 'review.md');
  const jsonPath = path.join(outputDir, 'verdict.json');

  // 1. Generate and write Markdown review
  const markdownContent = formatReviewBody(decision, seatResults);
  fs.writeFileSync(markdownPath, markdownContent, 'utf-8');

  // 2. Generate and write structured JSON verdict
  const jsonPayload = {
    verdict: decision.verdict,
    approveVotes: decision.approveVotes,
    requestChangesVotes: decision.requestChangesVotes,
    totalSeats: decision.totalSeats,
    summary: decision.summary,
    blockers: decision.blockers,
    warnings: decision.warnings,
    suggestions: decision.suggestions,
    seatResults: seatResults.map((s) => ({
      seatId: s.seatId,
      seatName: s.seatName,
      vote: s.vote,
      summary: s.summary,
      findingsCount: s.findings.length,
    })),
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2), 'utf-8');

  return {
    markdownPath,
    jsonPath,
  };
}
