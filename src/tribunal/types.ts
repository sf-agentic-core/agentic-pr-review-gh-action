export type SeatId = 'seat-a' | 'seat-b' | 'seat-c';

export type FindingSeverity = 'BLOCKER' | 'WARNING' | 'SUGGESTION';

export interface Finding {
  file: string;
  line?: number;
  severity: FindingSeverity;
  category: string;
  title: string;
  explanation: string;
  suggestion?: string;
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
