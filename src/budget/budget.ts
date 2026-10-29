export interface ReviewSummaryItem {
  user?: { login: string } | null;
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

const TRIBUNAL_HEADER = '## 🏛️ Synthetic Review Tribunal Verdict:';

/**
 * Counts how many prior tribunal review rounds have occurred on this PR
 * based on tamper-evident GitHub PR review history.
 */
export function countCorrectionRounds(reviews: ReviewSummaryItem[]): number {
  let count = 0;
  for (const r of reviews) {
    if (r.body && r.body.includes(TRIBUNAL_HEADER)) {
      count++;
    }
  }
  return count;
}

/**
 * Checks if the automated correction loop budget has reached or exceeded its limit.
 */
export function checkBudgetStatus(options: BudgetStatusOptions): BudgetStatus {
  const { currentCorrections, maxCorrections } = options;
  const isExhausted = currentCorrections >= maxCorrections;
  const remaining = Math.max(0, maxCorrections - currentCorrections);

  return {
    isExhausted,
    currentCorrections,
    maxCorrections,
    remaining,
    reason: isExhausted
      ? `Correction budget exhausted (${currentCorrections}/${maxCorrections} rounds used). Autonomous hallucination guard engaged.`
      : undefined,
  };
}
