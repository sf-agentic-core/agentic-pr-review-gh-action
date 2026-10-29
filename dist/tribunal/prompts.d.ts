import type { SeatId, PullRequestMetadata, SeatReviewResult } from './types.js';
export declare function buildSeatPrompt(seatId: SeatId, pr: PullRequestMetadata): {
    systemPrompt: string;
    userPrompt: string;
};
export declare function parseSeatOutput(seatId: SeatId, rawResponse: string): SeatReviewResult;
