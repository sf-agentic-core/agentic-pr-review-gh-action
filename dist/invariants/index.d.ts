import { type GitExecFn, type OverlapResult } from './overlap.js';
import { type EditSurfacesResult } from './surfaces.js';
import { type CommandExecFn, type SecretScanResult } from './secrets.js';
import { type ShellValidationResult } from './shell.js';
export interface PreflightOptions {
    baseRef: string;
    headRef: string;
    execGit: GitExecFn;
    execCommand: CommandExecFn;
    checkOverlap?: boolean;
    checkSecrets?: boolean;
    checkShellSyntax?: boolean;
    failOnScannerMissing?: boolean;
    protectedPatterns?: string[];
    allowedPatterns?: string[];
}
export interface PreflightSummary {
    success: boolean;
    failedStep?: 'git-overlap' | 'edit-surfaces' | 'secrets' | 'shell-syntax';
    reasons: string[];
    overlapResult?: OverlapResult;
    surfacesResult: EditSurfacesResult;
    secretsResult?: SecretScanResult;
    shellResult?: ShellValidationResult;
}
/**
 * Executes the complete pre-flight invariants pipeline:
 * 1. Collects changed files on branch.
 * 2. Validates edit surfaces against protected & allowed patterns.
 * 3. Detects git overlap / concurrent main drift hazards.
 * 4. Runs secret scanning (Gitleaks).
 */
export declare function runPreflightInvariants(options: PreflightOptions): Promise<PreflightSummary>;
export * from './overlap.js';
export * from './surfaces.js';
export * from './secrets.js';
export * from './shell.js';
