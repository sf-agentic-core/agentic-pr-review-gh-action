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
export declare function calculateQuorum(seatResults: SeatReviewResult[]): QuorumDecision;
export declare function deduplicateFindings(findings: Finding[]): Finding[];
