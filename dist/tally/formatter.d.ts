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
export declare function formatReviewBody(decision: QuorumDecision, seatResults: SeatReviewResult[]): string;
/**
 * Formats exactly ONE consolidated comment for all Major suggestions.
 */
export declare function formatMajorComment(majors: Finding[]): string;
/**
 * Formats exactly ONE consolidated comment for all Minor suggestions.
 */
export declare function formatMinorComment(minors: Finding[]): string;
/**
 * Maps Important/Blocker tribunal findings into GitHub inline diff comments.
 * Non-blocking findings (Major/Minor) are excluded here to prevent diff noise.
 */
export declare function mapFindingsToInlineComments(findings: Finding[]): GitHubInlineComment[];
/**
 * Formats a single Important finding using the strict peer-pr-review inline template:
 * **Important — must be fixed before approval**
 * <one sentence: what breaks, for whom, under which input or state>
 * <fenced quote of the current code, 1-4 lines>
 * Suggested fix: <concrete change, code snippet when shorter than prose>
 */
export declare function formatInlineComment(finding: Finding): string;
