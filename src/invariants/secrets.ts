export type CommandExecFn = (
  command: string,
  args: string[]
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

export interface SecretScanOptions {
  execCommand: CommandExecFn;
  sourceDir?: string;
  failOnScannerMissing?: boolean;
}

export interface SecretScanResult {
  isValid: boolean;
  leaksDetected: boolean;
  rawOutput?: string;
  reason?: string;
}

/**
 * Executes secret scanning on repository diff / uncommitted changes using Gitleaks.
 * Returns structured result indicating whether secrets were detected.
 */
export async function runSecretScan(options: SecretScanOptions): Promise<SecretScanResult> {
  const { execCommand, sourceDir = '.', failOnScannerMissing = true } = options;

  try {
    const res = await execCommand('gitleaks', [
      'protect',
      '--source',
      sourceDir,
      '--verbose',
      '--redact',
    ]);

    if (res.exitCode === 0) {
      return {
        isValid: true,
        leaksDetected: false,
        rawOutput: res.stdout,
      };
    } else {
      return {
        isValid: false,
        leaksDetected: true,
        rawOutput: res.stdout || res.stderr,
        reason: 'Secrets detected by Gitleaks security scanner.',
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const isMissingBinary = errorMsg.includes('ENOENT') || errorMsg.includes('not found');

    if (isMissingBinary && !failOnScannerMissing) {
      return {
        isValid: true,
        leaksDetected: false,
        reason: 'Gitleaks scanner skipped: binary not installed on runner.',
      };
    }

    return {
      isValid: false,
      leaksDetected: false,
      reason: `Gitleaks scanner not available or failed execution: ${errorMsg}`,
    };
  }
}
