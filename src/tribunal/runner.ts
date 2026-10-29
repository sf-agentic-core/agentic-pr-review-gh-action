import type {
  PullRequestMetadata,
  LLMProvider,
  LLMClientFn,
  SeatReviewResult,
  Finding,
  SeatId,
  SeatExecutionConfig,
} from './types.js';
import { buildSeatPrompt, parseSeatOutput } from './prompts.js';
import { callLLM } from './adapter.js';

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

const SEATS: SeatId[] = ['seat-a', 'seat-b', 'seat-c'];

/**
 * Concurrently evaluates a pull request across the three tribunal seats:
 * - Seat A: Correctness, Algorithmic Integrity & Contracts
 * - Seat B: Test Quality & Boundary Conditions
 * - Seat C: Cognitive Load & Radical Simplification
 */
export async function runTribunal(options: TribunalOptions): Promise<TribunalSummary> {
  const { pr, provider, apiKey, model, seatConfigs = {}, llmClient = callLLM } = options;

  let totalTokensUsed = 0;

  // Run all 3 seats concurrently
  const seatPromises = SEATS.map(async (seatId) => {
    const { systemPrompt, userPrompt } = buildSeatPrompt(seatId, pr);

    // Resolve per-seat configuration with fallback to global options
    const seatConfig = seatConfigs[seatId];
    const resolvedProvider = seatConfig?.provider || provider;
    const resolvedApiKey = seatConfig?.apiKey || apiKey;
    const resolvedModel = seatConfig?.model || model;

    if (!resolvedProvider || !resolvedApiKey || !resolvedModel) {
      throw new Error(
        `Missing LLM configuration for ${seatId}. Must provide either global provider/apiKey/model or seat-specific configuration.`
      );
    }

    const response = await llmClient({
      provider: resolvedProvider,
      apiKey: resolvedApiKey,
      model: resolvedModel,
      systemPrompt,
      userPrompt,
    });

    if (response.tokensUsed) {
      totalTokensUsed += response.tokensUsed;
    }

    return parseSeatOutput(seatId, response.content);
  });

  const seatResults = await Promise.all(seatPromises);

  const allFindings = seatResults.flatMap((r) => r.findings);
  const allBlockers = allFindings.filter((f) => f.severity === 'BLOCKER');

  return {
    seatResults,
    allFindings,
    allBlockers,
    hasBlockers: allBlockers.length > 0,
    totalTokensUsed,
  };
}
