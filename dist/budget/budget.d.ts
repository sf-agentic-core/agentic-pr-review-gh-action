export interface ReviewSummaryItem {
    user?: {
        login: string;
    } | null;
    body?: string | null;
}
export interface BudgetStatusOptions {
    currentCorrections: number;
    maxCorrections: number;
}
export interface BudgetStatus {
    isExhausted: boolean;
    currentCorrections: number;
    maxCorrections: number;
    remaining: number;
    reason?: string;
}
/**
 * Counts how many prior tribunal review rounds have occurred on this PR
 * based on tamper-evident GitHub PR review history.
 */
export declare function countCorrectionRounds(reviews: ReviewSummaryItem[]): number;
/**
 * Checks if the automated correction loop budget has reached or exceeded its limit.
 */
export declare function checkBudgetStatus(options: BudgetStatusOptions): BudgetStatus;
