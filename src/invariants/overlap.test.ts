import { describe, it, expect, vi } from 'vitest';
import { detectGitOverlap, type GitExecFn } from './overlap.js';

describe('detectGitOverlap', () => {
  it('returns no overlap when main and branch touched completely disjoint files', async () => {
    const mockExec: GitExecFn = vi.fn(async (args: string[]) => {
      if (args.includes('origin/main...HEAD')) {
        return 'src/feature-a.ts\nsrc/feature-a.test.ts\n';
      }
      if (args.includes('merge-base')) {
        return 'commit-base-sha-123\n';
      }
      if (args.includes('commit-base-sha-123..origin/main')) {
        return 'docs/readme.md\nsrc/other-feature.ts\n';
      }
      return '';
    });

    const result = await detectGitOverlap({
      baseRef: 'origin/main',
      headRef: 'HEAD',
      execGit: mockExec,
    });

    expect(result.hasOverlap).toBe(false);
    expect(result.overlappingFiles).toEqual([]);
    expect(result.branchFiles).toEqual(['src/feature-a.ts', 'src/feature-a.test.ts']);
    expect(result.mainDriftFiles).toEqual(['docs/readme.md', 'src/other-feature.ts']);
  });

  it('detects overlap when a file modified in PR was also modified in origin/main since fork', async () => {
    const mockExec: GitExecFn = vi.fn(async (args: string[]) => {
      if (args.includes('origin/main...HEAD')) {
        return 'src/config.ts\nsrc/index.ts\n';
      }
      if (args.includes('merge-base')) {
        return 'base-sha-456\n';
      }
      if (args.includes('base-sha-456..origin/main')) {
        return 'src/config.ts\npackage.json\n';
      }
      return '';
    });

    const result = await detectGitOverlap({
      baseRef: 'origin/main',
      headRef: 'HEAD',
      execGit: mockExec,
    });

    expect(result.hasOverlap).toBe(true);
    expect(result.overlappingFiles).toEqual(['src/config.ts']);
    expect(result.branchFiles).toEqual(['src/config.ts', 'src/index.ts']);
    expect(result.mainDriftFiles).toEqual(['src/config.ts', 'package.json']);
  });

  it('handles empty diffs gracefully', async () => {
    const mockExec: GitExecFn = vi.fn(async () => '');

    const result = await detectGitOverlap({
      baseRef: 'origin/main',
      headRef: 'HEAD',
      execGit: mockExec,
    });

    expect(result.hasOverlap).toBe(false);
    expect(result.overlappingFiles).toEqual([]);
    expect(result.branchFiles).toEqual([]);
    expect(result.mainDriftFiles).toEqual([]);
  });
});
