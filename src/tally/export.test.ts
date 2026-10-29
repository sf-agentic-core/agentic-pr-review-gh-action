import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { exportTribunalArtifacts } from './export.js';
import type { QuorumDecision } from '../tally/tally.js';
import type { SeatReviewResult } from '../tribunal/types.js';

describe('exportTribunalArtifacts', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tribunal-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const sampleSeats: SeatReviewResult[] = [
    {
      seatId: 'seat-a',
      seatName: 'Seat A: Logic',
      vote: 'REQUEST_CHANGES',
      summary: 'Null pointer hazard',
      findings: [
        {
          file: 'src/main.ts',
          line: 15,
          severity: 'BLOCKER',
          category: 'correctness',
          title: 'Unchecked null',
          explanation: 'Value can be null',
          suggestion: 'Add optional chaining',
        },
      ],
    },
  ];

  const sampleDecision: QuorumDecision = {
    verdict: 'REQUEST_CHANGES',
    approveVotes: 0,
    requestChangesVotes: 1,
    totalSeats: 1,
    blockers: sampleSeats[0].findings,
    warnings: [],
    suggestions: [],
    summary: '1 blocker found',
  };

  it('exports review.md and verdict.json to target output directory', async () => {
    const outDir = path.join(tmpDir, '.tribunal');

    const result = await exportTribunalArtifacts({
      outputDir: outDir,
      decision: sampleDecision,
      seatResults: sampleSeats,
    });

    expect(result.markdownPath).toBe(path.join(outDir, 'review.md'));
    expect(result.jsonPath).toBe(path.join(outDir, 'verdict.json'));

    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.jsonPath)).toBe(true);

    const mdContent = fs.readFileSync(result.markdownPath, 'utf-8');
    expect(mdContent).toContain('Synthetic Review Tribunal Verdict: `REQUEST_CHANGES`');
    expect(mdContent).toContain('Unchecked null');
    expect(mdContent).toContain('Add optional chaining');

    const jsonContent = JSON.parse(fs.readFileSync(result.jsonPath, 'utf-8'));
    expect(jsonContent.verdict).toBe('REQUEST_CHANGES');
    expect(jsonContent.blockers).toHaveLength(1);
    expect(jsonContent.blockers[0].file).toBe('src/main.ts');
  });
});
