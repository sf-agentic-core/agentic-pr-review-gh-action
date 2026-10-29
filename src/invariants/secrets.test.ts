import { describe, it, expect, vi } from 'vitest';
import { runSecretScan, type CommandExecFn } from './secrets.js';

describe('runSecretScan', () => {
  it('passes when gitleaks reports exit code 0', async () => {
    const mockExec: CommandExecFn = vi.fn(async (_cmd: string, _args: string[]) => {
      return { exitCode: 0, stdout: 'No leaks found', stderr: '' };
    });

    const result = await runSecretScan({
      execCommand: mockExec,
    });

    expect(result.isValid).toBe(true);
    expect(result.leaksDetected).toBe(false);
  });

  it('fails when gitleaks reports exit code 1 (leaks detected)', async () => {
    const mockExec: CommandExecFn = vi.fn(async (_cmd: string, _args: string[]) => {
      return { exitCode: 1, stdout: 'Gitleaks detected 2 secrets', stderr: '' };
    });

    const result = await runSecretScan({
      execCommand: mockExec,
    });

    expect(result.isValid).toBe(false);
    expect(result.leaksDetected).toBe(true);
    expect(result.reason).toContain('Secrets detected');
  });

  it('fails gracefully when gitleaks is not installed/found (exit code 127)', async () => {
    const mockExec: CommandExecFn = vi.fn(async () => {
      throw new Error('spawn gitleaks ENOENT');
    });

    const result = await runSecretScan({
      execCommand: mockExec,
      failOnScannerMissing: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Gitleaks scanner not available');
  });

  it('can be configured to skip/warn if gitleaks is not installed', async () => {
    const mockExec: CommandExecFn = vi.fn(async () => {
      throw new Error('spawn gitleaks ENOENT');
    });

    const result = await runSecretScan({
      execCommand: mockExec,
      failOnScannerMissing: false,
    });

    expect(result.isValid).toBe(true);
    expect(result.reason).toContain('Gitleaks scanner skipped');
  });
});
