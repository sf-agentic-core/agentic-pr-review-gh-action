import { describe, it, expect, vi } from 'vitest';
import { runPreflightInvariants, type PreflightOptions } from './index.js';

describe('runPreflightInvariants', () => {
  it('passes all pre-flight invariants when repo is clean, no overlap, no secret leaks', async () => {
    const mockGit = vi.fn(async (args: string[]) => {
      if (args.includes('origin/main...HEAD')) {
        return 'src/feature.ts\n';
      }
      if (args.includes('merge-base')) {
        return 'base123\n';
      }
      if (args.includes('base123..origin/main')) {
        return 'docs/info.md\n';
      }
      return '';
    });

    const mockCmd = vi.fn(async () => {
      return { exitCode: 0, stdout: 'clean', stderr: '' };
    });

    const options: PreflightOptions = {
      baseRef: 'origin/main',
      headRef: 'HEAD',
      execGit: mockGit,
      execCommand: mockCmd,
      checkOverlap: true,
      checkSecrets: true,
      protectedPatterns: ['.github/workflows/**'],
    };

    const result = await runPreflightInvariants(options);

    expect(result.success).toBe(true);
    expect(result.overlapResult?.hasOverlap).toBe(false);
    expect(result.surfacesResult.isValid).toBe(true);
    expect(result.secretsResult?.isValid).toBe(true);
  });

  it('fails immediately with descriptive reason when git overlap is detected', async () => {
    const mockGit = vi.fn(async (args: string[]) => {
      if (args.includes('origin/main...HEAD')) {
        return 'src/feature.ts\n';
      }
      if (args.includes('merge-base')) {
        return 'base123\n';
      }
      if (args.includes('base123..origin/main')) {
        return 'src/feature.ts\n';
      }
      return '';
    });

    const mockCmd = vi.fn(async () => {
      return { exitCode: 0, stdout: 'clean', stderr: '' };
    });

    const options: PreflightOptions = {
      baseRef: 'origin/main',
      headRef: 'HEAD',
      execGit: mockGit,
      execCommand: mockCmd,
      checkOverlap: true,
    };

    const result = await runPreflightInvariants(options);

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('git-overlap');
    expect(result.overlapResult?.hasOverlap).toBe(true);
    expect(result.reasons).toContain(
      'Git merge hazard: 1 file(s) modified in branch were also modified in origin/main: src/feature.ts'
    );
  });

  it('fails when protected paths are touched', async () => {
    const mockGit = vi.fn(async (args: string[]) => {
      if (args.includes('origin/main...HEAD')) {
        return '.github/workflows/deploy.yml\n';
      }
      return '';
    });

    const mockCmd = vi.fn(async () => ({ exitCode: 0, stdout: '', stderr: '' }));

    const options: PreflightOptions = {
      baseRef: 'origin/main',
      headRef: 'HEAD',
      execGit: mockGit,
      execCommand: mockCmd,
      checkOverlap: false,
      protectedPatterns: ['.github/workflows/**'],
    };

    const result = await runPreflightInvariants(options);

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('edit-surfaces');
    expect(result.surfacesResult.isValid).toBe(false);
  });
});
