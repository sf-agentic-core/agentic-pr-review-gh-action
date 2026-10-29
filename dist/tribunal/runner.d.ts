import type { PullRequestMetadata, LLMProvider, LLMClientFn, SeatReviewResult, Finding, SeatId, SeatExecutionConfig } from './types.js';
export interface TribunalOptions {
    pr: PullRequestMetadata;
    provider?: LLMProvider;
    apiKey?: string;
    model?: string;
    seatConfigs?: Partial<Record<SeatId, SeatExecutionConfig>>;
    llmClient?: LLMClientFn;
}
export interface TribunalSummary {
    seatResults: SeatReviewResult[];
    allFindings: Finding[];
    allBlockers: Finding[];
    hasBlockers: boolean;
    totalTokensUsed: number;
}
/**
 * Concurrently evaluates a pull request across the three tribunal seats:
 * - Seat A: Correctness, Algorithmic Integrity & Contracts
 * - Seat B: Test Quality & Boundary Conditions
 * - Seat C: Cognitive Load & Radical Simplification
 */
export declare function runTribunal(options: TribunalOptions): Promise<TribunalSummary>;
