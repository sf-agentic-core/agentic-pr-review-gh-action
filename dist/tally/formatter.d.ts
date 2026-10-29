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
export declare function formatReviewBody(decision: QuorumDecision, seatResults: SeatReviewResult[]): string;
/**
 * Maps tribunal findings that contain file and line coordinates into GitHub inline diff comments.
 */
export declare function mapFindingsToInlineComments(findings: Finding[]): GitHubInlineComment[];
export declare function formatInlineComment(finding: Finding): string;
