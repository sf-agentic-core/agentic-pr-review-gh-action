export type SeatId = 'seat-a' | 'seat-b' | 'seat-c';
/**
 * Finding severity tiers aligned with the 3-tier review ergonomics:
 * - IMPORTANT: Blocking findings that must be fixed before approval.
 *              Each Important finding generates its own inline comment thread on the diff.
 *              Triggers REQUEST_CHANGES for the seat.
 * - MAJOR: Materially better, non-blocking improvements.
 *          Grouped into exactly one consolidated PR comment for the entire tier.
 *          Does NOT block the seat vote.
 * - MINOR: Optional polish / nits.
 *          Grouped into exactly one separate consolidated PR comment.
 *          Does NOT block the seat vote.
 *
 * Backward-compatibility aliases:
 * BLOCKER -> IMPORTANT
 * WARNING -> MAJOR
 * SUGGESTION -> MINOR
 */
export type FindingSeverity = 'IMPORTANT' | 'MAJOR' | 'MINOR' | 'BLOCKER' | 'WARNING' | 'SUGGESTION';
export interface Finding {
    file: string;
    line?: number;
    severity: FindingSeverity;
    category: string;
    title: string;
    explanation: string;
    suggestion?: string;
    quotedCode?: string;
}
export interface SeatReviewResult {
    seatId: SeatId;
    seatName: string;
    vote: 'APPROVE' | 'REQUEST_CHANGES';
    summary: string;
    findings: Finding[];
    rawResponse?: string;
}
export interface PullRequestMetadata {
    title: string;
    description: string;
    author: string;
    baseRef: string;
    headRef: string;
    diff: string;
}
export type LLMProvider = 'anthropic' | 'openai' | 'deepseek' | 'google';
export interface SeatExecutionConfig {
    provider: LLMProvider;
    apiKey: string;
    model: string;
}
export interface LLMRequestOptions {
    provider: LLMProvider;
    apiKey: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
}
export interface LLMResponse {
    content: string;
    tokensUsed?: number;
}
export type LLMClientFn = (options: LLMRequestOptions) => Promise<LLMResponse>;
