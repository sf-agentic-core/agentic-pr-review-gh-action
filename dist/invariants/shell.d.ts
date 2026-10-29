import type { CommandExecFn } from './secrets.js';
export interface ShellBlock {
    file: string;
    script: string;
    line?: number;
}
export interface ShellSyntaxError {
    file: string;
    line?: number;
    error: string;
    snippet?: string;
}
export interface ShellValidationOptions {
    diff: string;
    execCommand: CommandExecFn;
}
export interface ShellValidationResult {
    isValid: boolean;
    syntaxErrors: ShellSyntaxError[];
    blocksChecked: number;
}
/**
 * Extracts shell scripts from diff:
 * 1. From files ending in `.sh` or `.bash`
 * 2. From `run: |` or `run: >` multi-line/single-line blocks in `.github/workflows/*.ya?ml`
 */
export declare function extractShellBlocksFromDiff(diff: string): ShellBlock[];
/**
 * Validates shell syntax deterministically using `bash -n` (no execution).
 * Sanitizes GitHub Actions expressions ${{ ... }} with safe shell placeholders before checking.
 */
export declare function validateShellSyntax(options: ShellValidationOptions): Promise<ShellValidationResult>;
