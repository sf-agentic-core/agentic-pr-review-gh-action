export type CommandExecFn = (command: string, args: string[]) => Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
}>;
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
export declare function runSecretScan(options: SecretScanOptions): Promise<SecretScanResult>;
