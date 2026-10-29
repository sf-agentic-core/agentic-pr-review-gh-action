import { describe, it, expect } from 'vitest';
import { calculateQuorum, deduplicateFindings } from './tally.js';
import type { Finding } from '../tribunal/types.js';

describe('deduplicateFindings', () => {
  it('deduplicates findings on the same file with close line numbers (within 5 lines)', () => {
    const findings: Finding[] = [
      {
        file: 'scaffolder/validate.sh',
        line: 47,
        severity: 'WARNING',
        category: 'robustness',
        title: 'in_list uses unquoted $*',
        explanation: 'Word splitting hazard',
      },
      {
        file: 'scaffolder/validate.sh',
        line: 50,
        severity: 'WARNING',
        category: 'robustness',
        title: 'Word-splitting hazard in in_list loop',
        explanation: 'Loop splits on IFS',
      },
    ];

    const deduped = deduplicateFindings(findings);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].file).toBe('scaffolder/validate.sh');
  });

  it('keeps findings on the same file if line numbers are far apart (>5 lines)', () => {
    const findings: Finding[] = [
      {
        file: 'src/index.ts',
        line: 10,
        severity: 'BLOCKER',
        category: 'correctness',
        title: 'Null dereference',
        explanation: 'Error at line 10',
      },
      {
        file: 'src/index.ts',
        line: 85,
        severity: 'BLOCKER',
        category: 'correctness',
        title: 'Unhandled promise rejection',
        explanation: 'Error at line 85',
      },
    ];

    const deduped = deduplicateFindings(findings);
    expect(deduped).toHaveLength(2);
  });
});
