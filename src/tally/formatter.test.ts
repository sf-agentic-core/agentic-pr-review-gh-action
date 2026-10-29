import { describe, it, expect } from 'vitest';
import { formatReviewBody, formatInlineComment, mapFindingsToInlineComments } from './formatter.js';
import type { QuorumDecision } from './tally.js';
import type { SeatReviewResult, Finding } from '../tribunal/types.js';

describe('formatReviewBody', () => {
  const seats: SeatReviewResult[] = [
    {
      seatId: 'seat-a',
      seatName: 'Seat A: Correctness & Logic',
      vote: 'REQUEST_CHANGES',
      summary: 'Race condition detected on line 12',
      findings: [
        {
          file: 'src/lock.ts',
          line: 12,
          severity: 'BLOCKER',
          category: 'concurrency',
          title: 'Missing Mutex release',
          explanation: 'Lock stays acquired if error is thrown.',
          suggestion: 'Wrap in try...finally block',
        },
      ],
    },
    {
      seatId: 'seat-b',
      seatName: 'Seat B: Test Quality',
      vote: 'APPROVE',
      summary: 'Tests are sufficient',
      findings: [],
    },
    {
      seatId: 'seat-c',
      seatName: 'Seat C: Cognitive Load & KISS',
      vote: 'APPROVE',
      summary: 'Clean and readable',
      findings: [],
    },
  ];

  const decision: QuorumDecision = {
    verdict: 'REQUEST_CHANGES',
    approveVotes: 2,
    requestChangesVotes: 1,
    totalSeats: 3,
    blockers: seats[0].findings,
    warnings: [],
    suggestions: [],
    summary: 'Asymmetric Quorum: 1 seat(s) raised blocking findings (1 unique blocker(s)). Changes requested.',
  };

  it('renders markdown table with tribunal votes and blocking findings list', () => {
    const markdown = formatReviewBody(decision, seats);

    expect(markdown).toContain('## 🏛️ Synthetic Review Tribunal Verdict: `REQUEST_CHANGES`');
    expect(markdown).toContain('| Seat | Vote | Summary |');
    expect(markdown).toContain('| Seat A: Correctness & Logic | ❌ REQUEST_CHANGES | Race condition detected on line 12 |');
    expect(markdown).toContain('| Seat B: Test Quality | ✅ APPROVE | Tests are sufficient |');
    expect(markdown).toContain('### 🚫 Blocking Findings (1)');
    expect(markdown).toContain('**Missing Mutex release** (`src/lock.ts:12`)');
    expect(markdown).toContain('> Lock stays acquired if error is thrown.');
    expect(markdown).toContain('**Suggestion:** Wrap in try...finally block');
  });
});

describe('mapFindingsToInlineComments', () => {
  it('converts findings with file and line into GitHub review inline comments', () => {
    const findings: Finding[] = [
      {
        file: 'src/index.ts',
        line: 10,
        severity: 'BLOCKER',
        category: 'logic',
        title: 'Null dereference',
        explanation: 'Value can be null',
      },
      {
        file: 'docs/readme.md',
        severity: 'WARNING',
        category: 'docs',
        title: 'Typo in heading',
        explanation: 'Fix spelling',
      },
    ];

    const inlineComments = mapFindingsToInlineComments(findings);

    // Only findings with a line number become inline comments
    expect(inlineComments).toHaveLength(1);
    expect(inlineComments[0].path).toBe('src/index.ts');
    expect(inlineComments[0].line).toBe(10);
    expect(inlineComments[0].body).toContain('🚨 **[BLOCKER] Null dereference**');
  });
});
