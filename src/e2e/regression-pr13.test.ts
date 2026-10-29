import { describe, it, expect, vi } from 'vitest';
import { runPreflightInvariants } from '../invariants/index.js';
import { calculateQuorum } from '../tally/tally.js';
import type { SeatReviewResult } from '../tribunal/types.js';

describe('Regression Suite: PR-13 Findings', () => {
  it('Phase 0 pre-flight catches unclosed subshell $( syntax error deterministically', async () => {
    // Simulating the actual syntax error in commit 1a7a649:
    // response=$(gh api ... --jq '.full_name + " created"' 2>&1 && exit 0
    // missing closing parenthesis )
    const brokenWorkflowDiff = `diff --git a/.github/workflows/scaffold-repository.yaml b/.github/workflows/scaffold-repository.yaml
--- a/.github/workflows/scaffold-repository.yaml
+++ b/.github/workflows/scaffold-repository.yaml
@@ -160,3 +160,4 @@
+      - name: Create the repository
+        run: |
+          response=$(gh api -X POST "orgs/$ORG/repos" --jq '.full_name + " created"' 2>&1 && exit 0`;

    const mockGit = vi.fn(async () => brokenWorkflowDiff);
    const mockCmd = vi.fn(async (cmd: string, args: string[]) => {
      if (cmd === 'bash' && args.includes('-n')) {
        return {
          exitCode: 2,
          stdout: '',
          stderr: 'syntax error: unexpected EOF while looking for matching `)`',
        };
      }
      return { exitCode: 0, stdout: '', stderr: '' };
    });

    const preflight = await runPreflightInvariants({
      baseRef: 'master',
      headRef: 'EPDT-1279',
      execGit: mockGit,
      execCommand: mockCmd,
      checkOverlap: false,
      checkSecrets: false,
      checkShellSyntax: true,
    });

    expect(preflight.success).toBe(false);
    expect(preflight.failedStep).toBe('shell-syntax');
    expect(preflight.reasons[0]).toContain('unexpected EOF while looking for matching `)`');
  });

  it('Tally engine merges duplicated findings on the same file with close line numbers', () => {
    // Regression check for the duplicate in_list finding (warnings 4 and 20 in round 2)
    const seats: SeatReviewResult[] = [
      {
        seatId: 'seat-a',
        seatName: 'Seat A',
        vote: 'APPROVE',
        summary: 'Pass',
        findings: [
          {
            file: 'scaffolder/validate.sh',
            line: 47,
            severity: 'WARNING',
            category: 'word_splitting',
            title: 'in_list uses unquoted $* causing word-splitting',
            explanation: 'IFS hazard',
          },
        ],
      },
      {
        seatId: 'seat-c',
        seatName: 'Seat C',
        vote: 'APPROVE',
        summary: 'Pass',
        findings: [
          {
            file: 'scaffolder/validate.sh',
            line: 50,
            severity: 'WARNING',
            category: 'word_splitting',
            title: 'in_list word-splitting hazard in loop',
            explanation: 'Space-separated token issue',
          },
        ],
      },
    ];

    const decision = calculateQuorum(seats);
    expect(decision.warnings).toHaveLength(1); // Merged into 1
    expect(decision.warnings[0].file).toBe('scaffolder/validate.sh');
  });
});
