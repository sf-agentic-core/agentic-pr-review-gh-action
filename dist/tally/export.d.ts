import type { QuorumDecision } from './tally.js';
import type { SeatReviewResult } from '../tribunal/types.js';
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
export declare function exportTribunalArtifacts(options: ArtifactExportOptions): Promise<ArtifactExportResult>;
